import { SetStoreFunction, createStore, produce } from "solid-js/store";
import { getLCAChainSuffixes } from "./util/lca";
import _ from "lodash";
import { maybeAdd, maybeAddAll, maybeDiv, maybeSub } from "./util/maybe";
import { createContext, useContext } from "solid-js";
import { BBox } from "./util/bbox";

export type Id = string;

export type { BBox };

export type BBoxOwners = { [key in keyof BBox]?: Id };

export type Transform = {
  translate: {
    x?: number;
    y?: number;
  };
};

export type RequiredTransform = {
  translate: {
    x: number;
    y: number;
  };
};

export type TransformOwners = {
  translate: {
    x?: Id;
    y?: Id;
  };
};

export type ChildNode = {
  name: Id;
  bbox: BBox;
  owned: {
    x: boolean;
    y: boolean;
    width: boolean;
    height: boolean;
  };
};

export type ScenegraphNode =
  | {
      type: "node";
      bbox: BBox;
      bboxOwners: BBoxOwners;
      transform: Transform;
      transformOwners: TransformOwners;
      children: Set<Id>;
      parent: Id | null;
      customData?: any;
    }
  | {
      type: "ref";
      refId: Id;
      parent: Id | null;
    };

export type Scenegraph = {
  [key: Id]: ScenegraphNode;
};

export const createScenegraph = (): ScenegraphContextType => {
  const [scenegraph, setScenegraph] = createStore<Scenegraph>({});

  // constructors //
  const createNode = (id: Id, parentId: Id | null) => {
    setScenegraph(id, {
      type: "node",
      bbox: {},
      bboxOwners: {},
      transform: { translate: {} },
      transformOwners: { translate: {} },
      children: new Set(),
      parent: parentId,
      customData: { customData: {} },
    });

    if (parentId !== null) {
      setScenegraph(parentId, (node: ScenegraphNode) => {
        if (node.type === "ref") {
          console.error("Cannot add children to a ref node.");
          return node;
        }

        return {
          ...node,
          children: new Set([...node.children, id]),
        };
      });
    }
  };

  const createRef = (id: Id, refId: Id, parentId: Id) => {
    setScenegraph(id, {
      type: "ref",
      refId,
      parent: parentId,
    });

    if (parentId !== null) {
      setScenegraph(parentId, (node: ScenegraphNode) => {
        if (node.type === "ref") {
          console.error("Cannot add children to a ref node.");
          return node;
        }

        return {
          ...node,
          children: new Set([...node.children, id]),
        };
      });
    }
  };

  // returns resolved node (either the input node or the node it references)
  // if the input node is a ref, then it returns the accumulated transform from the node to the ref
  // TODO: doesn't support ref of ref
  const resolveRef = (
    id: Id,
    mode: "read" | "write" | "check",
    accumulatedTransform: RequiredTransform = {
      translate: { x: 0, y: 0 },
    }
  ): {
    id: Id;
    transform: RequiredTransform;
  } => {
    const node = scenegraph[id];

    // base case
    if (node.type === "node") {
      return {
        id,
        transform: accumulatedTransform,
      };
    }

    const refNode = scenegraph[node.refId];

    if (refNode === undefined) {
      throw new Error(`Ref node ${node.refId} not found`);
    }

    if (refNode.type === "ref") {
      throw new Error("Ref of ref not supported");
    }

    if (mode === "check") {
      // skip materialization
      return {
        id: node.refId,
        transform: accumulatedTransform,
      };
    }

    // To resolve a reference we have to do two things:
    // 1. If the node side's transform is fully resolved, we default transforms on the ref side to 0
    // 2. Accumulate the transform from the node to the ref
    /* 
Suppose we have the following graph:
Example {x: ...}
  Circle {x: 50} #circle
  Align {x: ?}
    Ref #circle

Then we will fill in Align's x transform.
Example {x: ...}
  Circle {x: 50} # circle
  Align {x: 0}
    Ref circle

The accumulated transform will be {x: 50}, which is the transform of the circle as it appears to
the align node.
*/
    const [idSuffix, refIdSuffix] = getLCAChainSuffixes(
      scenegraph,
      id,
      node.refId
    );

    if (
      // if mode is read and the ref node's left is undefined, then we don't want to materialize
      // transforms b/c we can't resolve the ref node's left anyway
      !(
        mode === "read" &&
        (refNode as ScenegraphNode & { type: "node" }).bbox.left === undefined
      )
    ) {
      // default all undefined transforms to 0 on the id side
      for (const idSf of idSuffix) {
        setScenegraph(
          idSf,
          produce((n: ScenegraphNode) => {
            const node = n as ScenegraphNode & { type: "node" };
            if (node.transform.translate.x === undefined) {
              node.transform.translate.x = 0;
              node.transformOwners.translate.x = id;
            }
          })
        );

        accumulatedTransform.translate.x -= (
          scenegraph[idSf] as ScenegraphNode & { type: "node" }
        ).transform.translate.x!;
      }

      for (const refIdSf of refIdSuffix) {
        setScenegraph(
          refIdSf,
          produce((n: ScenegraphNode) => {
            const node = n as ScenegraphNode & { type: "node" };
            if (node.transform.translate.x === undefined) {
              node.transform.translate.x = 0;
              node.transformOwners.translate.x = id;
            }
          })
        );

        accumulatedTransform.translate.x += (
          scenegraph[refIdSf] as ScenegraphNode & { type: "node" }
        ).transform.translate.x!;
      }
    }

    if (
      // if mode is read and the ref node's top is undefined, then we don't want to materialize
      // transforms b/c we can't resolve the ref node's top anyway
      !(
        mode === "read" &&
        (refNode as ScenegraphNode & { type: "node" }).bbox.top === undefined
      )
    ) {
      // default all undefined transforms to 0 on the id side
      for (const idSf of idSuffix) {
        setScenegraph(
          idSf,
          produce((n: ScenegraphNode) => {
            const node = n as ScenegraphNode & { type: "node" };
            if (node.transform.translate.y === undefined) {
              node.transform.translate.y = 0;
              node.transformOwners.translate.y = id;
            }
          })
        );

        accumulatedTransform.translate.y -= (
          scenegraph[idSf] as ScenegraphNode & { type: "node" }
        ).transform.translate.y!;
      }

      for (const refIdSf of refIdSuffix) {
        setScenegraph(
          refIdSf,
          produce((n: ScenegraphNode) => {
            const node = n as ScenegraphNode & { type: "node" };
            if (node.transform.translate.y === undefined) {
              node.transform.translate.y = 0;
              node.transformOwners.translate.y = id;
            }
          })
        );

        accumulatedTransform.translate.y += (
          scenegraph[refIdSf] as ScenegraphNode & { type: "node" }
        ).transform.translate.y!;
      }
    }
    return resolveRef(node.refId, mode, accumulatedTransform);
  };

  const getBBox = (id: string): BBox => {
    const { id: resolvedId, transform } = resolveRef(id, "read");
    const node = scenegraph[resolvedId] as ScenegraphNode & { type: "node" }; // guaranteed by resolveRef

    return {
      get left() {
        return maybeAddAll(
          node.bbox.left,
          node.transform.translate.x,
          transform.translate.x
        );
      },
      get top() {
        return maybeAddAll(
          node.bbox.top,
          node.transform.translate.y,
          transform.translate.y
        );
      },
      get width() {
        return node.bbox.width;
      },
      get height() {
        return node.bbox.height;
      },
      get right() {
        return maybeAdd(this.left, this.width);
      },
      get bottom() {
        return maybeAdd(this.top, this.height);
      },
      get centerX() {
        return maybeAdd(this.left, maybeDiv(this.width, 2));
      },
      get centerY() {
        return maybeAdd(this.top, maybeDiv(this.height, 2));
      },
    };
  };

  // merge bbox and transform into the id node. these properties are owned by the owner node
  const mergeBBoxAndTransform = (
    owner: Id,
    id: Id,
    bbox: BBox,
    transform: Transform
  ) => {
    // TODO: should I untrack this?
    // const { id: resolvedId, transform: accumulatedTransform } = resolveRef(id);

    // if any of the bbox values are NaN (undefined is ok), console.error and skip
    for (const key of Object.keys(bbox) as Array<keyof BBox>) {
      if (bbox[key] !== undefined && isNaN(bbox[key]!)) {
        console.error(
          `setBBox: ${owner} tried to update ${id}'s bbox with ${JSON.stringify(
            bbox
          )}, but the bbox contains NaN values. Skipping...`
        );
        return;
      }
    }

    setScenegraph(
      id,
      produce((n: ScenegraphNode) => {
        const node = n as ScenegraphNode & { type: "node" }; // guaranteed by resolveRef

        // check bbox ownership
        for (const key of Object.keys(bbox) as Array<keyof BBox>) {
          if (
            bbox[key] !== undefined &&
            node.bboxOwners[key] !== undefined &&
            node.bboxOwners[key] !== owner
          ) {
            console.error(
              `${owner} tried to set ${id}'s ${key} to ${bbox[key]} but it was already set by ${node.bboxOwners[key]}. Only one component can set a bbox property. We skipped this update.`
            );
            return node;
          }
        }

        // check transform ownership
        for (const key of Object.keys(transform?.translate ?? {}) as Array<
          keyof Transform["translate"]
        >) {
          if (
            transform?.translate[key] !== undefined &&
            node.transformOwners.translate[key] !== undefined &&
            node.transformOwners.translate[key] !== owner
          ) {
            console.error(
              `${owner} tried to set ${id}'s translate.${key} to ${transform?.translate[key]} but it was already set by ${node.transformOwners.translate[key]}. Only one component can set a transform property. We skipped this update.`
            );
            return node;
          }
        }

        const newBBoxOwners: BBoxOwners = {
          ...(bbox.left !== undefined ? { left: owner } : {}),
          ...(bbox.top !== undefined ? { top: owner } : {}),
          ...(bbox.width !== undefined ? { width: owner } : {}),
          ...(bbox.height !== undefined ? { height: owner } : {}),
        };

        const newTransformOwners: TransformOwners = {
          translate: {
            x: transform?.translate.x !== undefined ? owner : undefined,
            y: transform?.translate.y !== undefined ? owner : undefined,
          },
        };

        const newTransform = {
          translate: transform?.translate ?? {},
        };

        for (const key of Object.keys(bbox) as Array<keyof BBox>) {
          if (bbox[key] !== undefined) {
            node.bbox[key] = bbox[key];
          }
        }

        for (const key of Object.keys(newBBoxOwners) as Array<keyof BBox>) {
          if (newBBoxOwners[key] !== undefined) {
            node.bboxOwners[key] = newBBoxOwners[key];
          }
        }

        if (newTransform.translate.x !== undefined) {
          node.transform.translate.x = newTransform.translate.x;
        }

        if (newTransform.translate.y !== undefined) {
          node.transform.translate.y = newTransform.translate.y;
        }

        if (newTransformOwners.translate.x !== undefined) {
          node.transformOwners.translate.x = newTransformOwners.translate.x;
        }

        if (newTransformOwners.translate.y !== undefined) {
          node.transformOwners.translate.y = newTransformOwners.translate.y;
        }
      })
    );
  };

  const setCustomData = (id: Id, customData: any) => {
    setScenegraph(
      id,
      produce((n: ScenegraphNode) => {
        const node = n as ScenegraphNode & { type: "node" }; // guaranteed by resolveRef

        if (customData !== undefined) {
          node.customData = customData;
        }
      })
    );
  };

  const setBBox = (owner: Id, id: Id, bbox: BBox) => {
    const { id: resolvedId, transform: accumulatedTransform } = resolveRef(
      id,
      "write"
    );

    // if any of the bbox values are NaN (undefined is ok), console.error and skip
    for (const key of Object.keys(bbox) as Array<keyof BBox>) {
      if (bbox[key] !== undefined && isNaN(bbox[key]!)) {
        // error message should include id, bbox, owner
        console.error(
          `setBBox: ${owner} tried to update ${resolvedId}'s bbox with ${JSON.stringify(
            bbox
          )}, but the bbox contains NaN values. Skipping...`
        );
        return;
      }
    }

    const node = scenegraph[resolvedId] as ScenegraphNode & { type: "node" }; // guaranteed by resolveRef

    const proposedBBox: BBox = {};
    const proposedTransform: Transform = {
      translate: {},
    };

    if (bbox.left !== undefined) {
      if (accumulatedTransform.translate.x === undefined) {
        console.error(
          `setBBox: ${owner} tried to update ${resolvedId}'s bbox.left with ${bbox.left}, but the accumulated transform.translate.x is undefined. Skipping...`
        );
      }
      if (
        node.bboxOwners.left === owner ||
        node.bboxOwners.left === undefined
      ) {
        proposedBBox.left = bbox.left;
        proposedTransform.translate.x = 0;
      } else if (
        node.transformOwners.translate.x === owner ||
        node.transformOwners.translate.x === undefined
      ) {
        proposedTransform.translate.x = bbox.left - node.bbox.left!;
      }
    }

    if (bbox.width !== undefined) {
      if (
        node.bboxOwners.width === owner ||
        node.bboxOwners.width === undefined
      ) {
        proposedBBox.width = bbox.width;
      } else {
        console.error(
          `setBBox: ${owner} tried to update ${resolvedId}'s bbox.width with ${bbox.width}, but it was already set by ${node.bboxOwners.width}. Only one component can set a bbox property. We skipped this update.`
        );
        return;
      }
    }

    if (bbox.top !== undefined) {
      if (accumulatedTransform.translate.y === undefined) {
        console.error(
          `setBBox: ${owner} tried to update ${resolvedId}'s bbox.top with ${bbox.top}, but the accumulated transform.translate.y is undefined. Skipping...`
        );
      }
      if (node.bboxOwners.top === owner || node.bboxOwners.top === undefined) {
        proposedBBox.top = bbox.top;
        proposedTransform.translate.y = 0;
      } else if (
        node.transformOwners.translate.y === owner ||
        node.transformOwners.translate.y === undefined
      ) {
        proposedTransform.translate.y = bbox.top - node.bbox.top!;
      }
    }

    if (bbox.height !== undefined) {
      if (
        node.bboxOwners.height === owner ||
        node.bboxOwners.height === undefined
      ) {
        proposedBBox.height = bbox.height;
      } else {
        console.error(
          `setBBox: ${owner} tried to update ${resolvedId}'s bbox.height with ${bbox.height}, but it was already set by ${node.bboxOwners.height}. Only one component can set a bbox property. We skipped this update.`
        );
        return;
      }
    }

    proposedTransform.translate.x = maybeAdd(
      proposedTransform.translate.x,
      accumulatedTransform.translate.x
    );

    proposedTransform.translate.y = maybeAdd(
      proposedTransform.translate.y,
      accumulatedTransform.translate.y
    );

    mergeBBoxAndTransform(owner, resolvedId, proposedBBox, proposedTransform);
  };

  const ownedByOther = (
    id: Id, // with respect to this node
    check: Id, // is this node already owned
    axis: "x" | "y" | "width" | "height" // along this axis
  ): boolean => {
    // debugger;
    const { id: resolvedId } = resolveRef(check, "check");
    const node = scenegraph[resolvedId] as ScenegraphNode & { type: "node" }; // guaranteed by resolveRef

    if (axis === "x") {
      return (
        node.transformOwners.translate.x !== undefined &&
        node.transformOwners.translate.x !== id
      );
    } else if (axis === "y") {
      return (
        node.transformOwners.translate.y !== undefined &&
        node.transformOwners.translate.y !== id
      );
    } else if (axis === "width") {
      return (
        node.bboxOwners.width !== undefined && node.bboxOwners.width !== id
      );
    } else if (axis === "height") {
      return (
        node.bboxOwners.height !== undefined && node.bboxOwners.height !== id
      );
    } else {
      throw new Error("ownedByOther: axis is neither x nor y");
    }
  };

  const createChildRepr = (owner: Id, childId: Id): ChildNode => {
    return {
      name: childId,
      bbox: {
        get left() {
          return getBBox(childId).left;
        },
        set left(left: number | undefined) {
          if (left === undefined) {
            console.error(
              `${owner} tried to set ${childId}'s left to undefined. Skipping...`
            );
            return;
          }

          setBBox(owner, childId, { left });
        },
        get top() {
          return getBBox(childId).top;
        },
        set top(top: number | undefined) {
          if (top === undefined) {
            console.error(
              `${owner} tried to set ${childId}'s top to undefined. Skipping...`
            );
            return;
          }

          setBBox(owner, childId, { top });
        },
        get width() {
          return getBBox(childId).width;
        },
        set width(width: number | undefined) {
          if (width === undefined) {
            console.error(
              `${owner} tried to set ${childId}'s width to undefined. Skipping...`
            );
            return;
          }

          setBBox(owner, childId, { width });
        },
        get height() {
          return getBBox(childId).height;
        },
        set height(height: number | undefined) {
          if (height === undefined) {
            console.error(
              `${owner} tried to set ${childId}'s height to undefined. Skipping...`
            );
            return;
          }

          setBBox(owner, childId, { height });
        },
        get right() {
          return maybeAdd(this.left, this.width);
        },
        get bottom() {
          return maybeAdd(this.top, this.height);
        },
        get centerX() {
          return maybeAdd(this.left, maybeDiv(this.width, 2));
        },
        get centerY() {
          return maybeAdd(this.top, maybeDiv(this.height, 2));
        },
      },
      owned: {
        get x() {
          return ownedByOther(owner, childId, "x");
        },
        get y() {
          return ownedByOther(owner, childId, "y");
        },
        get width() {
          return ownedByOther(owner, childId, "width");
        },
        get height() {
          return ownedByOther(owner, childId, "height");
        },
      },
    };
  };

  return {
    scenegraph,
    // constructors
    createNode,
    createRef,
    // mid-level API
    resolveRef,
    mergeBBoxAndTransform,
    // API
    setCustomData,
    getBBox,
    setBBox,
    ownedByOther,
    createChildRepr,
  };
};

export type ScenegraphContextType = {
  scenegraph: Scenegraph;
  createNode: (id: Id, parentId: Id | null) => void;
  createRef: (id: Id, refId: Id, parentId: Id) => void;
  resolveRef: (
    id: Id,
    mode: "read" | "write" | "check"
  ) => { id: Id; transform: Transform };
  mergeBBoxAndTransform: (
    owner: Id,
    id: Id,
    bbox: BBox,
    transform: Transform
  ) => void;
  setCustomData: (id: Id, customData: any) => void;
  getBBox: (id: Id) => BBox;
  setBBox: (owner: Id, id: Id, bbox: BBox) => void;
  // ownedByUs: (
  //   id: Id,
  //   check: Id,
  //   axis: "x" | "y" | "width" | "height"
  // ) => boolean;
  ownedByOther: (
    id: Id,
    check: Id,
    axis: "x" | "y" | "width" | "height"
  ) => boolean;
  createChildRepr: (owner: Id, childId: Id) => ChildNode;
};

export const ScenegraphContext = createContext<ScenegraphContextType | null>(
  null
);

export const useScenegraph = () => {
  const context = useContext(ScenegraphContext);

  if (context === null) {
    throw new Error("useScenegraph must be used within a ScenegraphProvider");
  }

  const { getBBox, setBBox, ownedByOther } = context;
  return { getBBox, setBBox, ownedByOther };
};

export const UNSAFE_useScenegraph = () => {
  const context = useContext(ScenegraphContext);

  if (context === null) {
    throw new Error("useScenegraph must be used within a ScenegraphProvider");
  }

  return context;
};

export const ParentIDContext = createContext<Id | null>(null);

export type LayoutFn = (childNodes: ChildNode[]) => {
  bbox: Partial<BBox>;
  transform: Transform;
  customData?: any;
};
