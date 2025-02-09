import { Component } from "solid-js";
import h from "solid-js/h";

import { Align as AlignJSX } from "./align";
import { Arrow as ArrowJSX } from "./arrow";
import { Background as BackgroundJSX } from "./background";
import { Blob as BlobJSX } from "./blob";
import { Bluefish as BluefishJSX } from "./bluefish";
import { Circle as CircleJSX } from "./circle";
import { Col as ColJSX } from "./col";
import { Distribute as DistributeJSX } from "./distribute";
import { Group as GroupJSX } from "./group";
import { Layout as LayoutJSX } from "./layout";
import { Rect as RectJSX } from "./rect";
import { Ref as RefJSX } from "./ref";
import { Row as RowJSX } from "./row";
import { Text as TextJSX } from "./text";
import { withBluefish as withBluefishJSX } from "./withBluefish";

export function component<P>(
  fn: Component<P>
): (props: P, children: JSX.Element[]) => JSX.Element;
export function component<P>(
  fn: Component<P>
): (props: P, ...children: JSX.Element[]) => JSX.Element;
export function component<P>(
  fn: Component<P>
): (children: JSX.Element[]) => JSX.Element;
export function component<P>(
  fn: Component<P>
): (...children: JSX.Element[]) => JSX.Element;
export function component<P>(fn: Component<P>) {
  return (...args: any[]) => {
    return h(fn, ...args);
  };
}

export const Align = component(AlignJSX);
export const Arrow = component(ArrowJSX);
export const Background = component(BackgroundJSX);
export const Blob = component(BlobJSX);
export const Bluefish = component(BluefishJSX);
export const Circle = component(CircleJSX);
export const Col = component(ColJSX);
export const Distribute = component(DistributeJSX);
export const Group = component(GroupJSX);
export const Layout = component(LayoutJSX);
export const Rect = component(RectJSX);
export const Ref = component(RefJSX);
export const Row = component(RowJSX);
export const Text = component(TextJSX);
export function withBluefish(WrappedComponent: Component) {
  return component(withBluefishJSX(WrappedComponent));
}
