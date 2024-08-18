import { BoxData, DropDirection, LayoutData, PanelData, TabBase, TabData, TabGroup } from "./DockData";
export declare function getUpdatedObject(obj: any): any;
export declare function nextId(): string;
export declare function nextZIndex(current?: number): number;
export declare enum Filter {
    Tab = 1,
    Panel = 2,
    Box = 4,
    Docked = 8,
    Floated = 16,
    Windowed = 32,
    Max = 64,
    EveryWhere = 120,
    AnyTab = 121,
    AnyPanel = 122,
    AnyTabPanel = 123,
    All = 127
}
export declare function find(layout: LayoutData, id: string | ((item: PanelData | TabData | BoxData) => boolean), filter?: Filter): PanelData | TabData | BoxData | undefined;
export declare function addNextToTab(layout: LayoutData, source: TabData | PanelData, target: TabData, direction: DropDirection): LayoutData;
export declare function addTabToPanel(layout: LayoutData, source: TabData | PanelData, panel: PanelData, idx?: number): LayoutData;
export declare function converToPanel(source: TabData | PanelData): PanelData;
export declare function dockPanelToPanel(layout: LayoutData, newPanel: PanelData, panel: PanelData, direction: DropDirection): LayoutData;
export declare function dockPanelToBox(layout: LayoutData, newPanel: PanelData, box: BoxData, direction: DropDirection): LayoutData;
export declare function floatPanel(layout: LayoutData, newPanel: PanelData, rect?: {
    left: number;
    top: number;
    width: number;
    height: number;
}): LayoutData;
export declare function panelToWindow(layout: LayoutData, newPanel: PanelData): LayoutData;
export declare function removeFromLayout(layout: LayoutData, source: TabData | PanelData): LayoutData;
export declare function moveToFront(layout: LayoutData, source: TabData | PanelData): LayoutData;
export declare function maximize(layout: LayoutData, source: TabData | PanelData): LayoutData;
export declare function fixFloatPanelPos(layout: LayoutData, layoutWidth?: number, layoutHeight?: number): LayoutData;
export declare function fixLayoutData(layout: LayoutData, groups?: {
    [key: string]: TabGroup;
}, loadTab?: (tab: TabBase) => TabData): LayoutData;
export declare function replacePanel(layout: LayoutData, panel: PanelData, newPanel: PanelData): LayoutData;
export declare function getFloatPanelSize(panel: HTMLElement, tabGroup: TabGroup): number[];
export declare function findNearestPanel(rectFrom: DOMRect, rectTo: DOMRect, direction: string): number;
