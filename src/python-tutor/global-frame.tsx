import { For, createUniqueId } from "solid-js";
import { Id } from "../../src/scenegraph";
import Rect from "../../src/rect";
import Group from "../../src/group";
import Align from "../../src/align";
import Ref from "../../src/ref";
import { StackSlot } from "./stack-slot";
import Distribute from "../../src/distribute";
import Text from "../../src/text";
import { Value } from "./types";

export type GlobalFrameProps = {
  id?: Id;
  variables: { variable: string; value: Value }[];
};

export function GlobalFrame(props: GlobalFrameProps) {
  const id = props.id ?? createUniqueId();

  // Font declaration
  const fontFamily = "Andale mono, monospace";

  return (
    <Group x={0} y={0} id={props.id ?? `group_${id}`}>
      {/* Global Frame and relevant text */}
      <Rect id={`frame${id}`} height={300} width={200} fill={"#e2ebf6"} />
      <Rect id={`frameBorder${id}`} height={300} width={5} fill={"#a6b3b6"} />
      {/* TODO: there is a bug where the text is showing up lower than I expect it to... */}
      <Text
        id={`label${id}`}
        font-size={"24px"}
        font-family={fontFamily}
        fill={"black"}
      >
        Global Frame
      </Text>
      <Align alignment="topCenter">
        <Ref refId={`label${id}`} />
        <Ref refId={`frame${id}`} />
      </Align>
      <Align alignment="centerLeft">
        <Ref refId={`frameBorder${id}`} />
        <Ref refId={`frame${id}`} />
      </Align>
      <Group id={`frameVariables${id}`}>
        <For each={props.variables}>
          {(variable: any, i) => (
            <StackSlot
              id={`stackSlot${i()}_${id}`}
              variable={variable.variable}
              value={variable.value}
            />
          )}
        </For>
        <Align alignment="right">
          <For each={props.variables}>
            {(variable: any, i) => <Ref refId={`stackSlot${i()}_${id}`} />}
          </For>
        </Align>
        <Distribute direction="vertical" spacing={10}>
          <For each={props.variables}>
            {(variable: any, i) => <Ref refId={`stackSlot${i()}_${id}`} />}
          </For>
        </Distribute>
      </Group>
      <Distribute direction="vertical" spacing={10}>
        <Ref refId={`label${id}`} />
        <Ref refId={`frameVariables${id}`} />
      </Distribute>
      <Align alignment="right">
        <Ref refId={`frameVariables${id}`} />
        <Ref refId={`label${id}`} />
      </Align>
    </Group>
  );
}

export default GlobalFrame;
