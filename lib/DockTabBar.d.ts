import * as React from "react";
import * as DragManager from "./dragdrop/DragManager";
import type { TabNavListProps } from "rc-tabs/lib/TabNavList";
interface DockTabBarProps extends TabNavListProps {
    isMaximized: boolean;
    onDragStart?: DragManager.DragHandler;
    onDragMove?: DragManager.DragHandler;
    onDragEnd?: DragManager.DragHandler;
    onDragOver?: DragManager.DragHandler;
    onDrop?: DragManager.DropHandler;
    TabNavList: React.ComponentType<TabNavListProps>;
}
export declare function DockTabBar(props: DockTabBarProps): JSX.Element;
export {};
