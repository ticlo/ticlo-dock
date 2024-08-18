import * as React from "react";
import { BoxData, DockContext, DropDirection, FloatPosition, LayoutBase, LayoutData, LayoutSize, PanelBase, PanelData, TabBase, TabData, TabGroup, TabPaneCache } from "./DockData";
import * as Algorithm from "./Algorithm";
export interface LayoutProps {
    /**
     * when there are multiple DockLayout, by default, you can't drag panel between them
     * but if you assign same dockId, it will allow panels to be dragged from one layout to another
     */
    dockId?: string;
    /**
     * - when [[LayoutProps.loadTab]] callback is defined, tabs in defaultLayout only need to have an id, unless loadTab requires other fields
     * - when [[LayoutProps.loadTab]] is not defined, tabs must contain title and content, as well as other fields in [[TabData]] when needed
     */
    defaultLayout?: LayoutData;
    /**
     * set layout only when you want to use DockLayout as a fully controlled react component
     * when using controlled layout, [[LayoutProps.onChange]] must be set to enable any layout change
     */
    layout?: LayoutBase;
    /**
     * Tab Groups, defines additional configuration for different groups
     */
    groups?: {
        [key: string]: TabGroup;
    };
    /**
     * @param newLayout layout data can be set to [[LayoutProps.layout]] directly when used as controlled component
     * @param currentTabId id of current tab
     * @param direction direction of the dock change
     */
    onLayoutChange?(newLayout: LayoutBase, currentTabId?: string, direction?: DropDirection): void;
    /**
     * - default mode: showing 4 to 9 squares to help picking drop areas
     * - edge mode: using the distance between mouse and panel border to pick drop area
     *   - in edge mode, dragging float panel's header won't bring panel back to dock layer
     */
    dropMode?: 'default' | 'edge';
    /**
     * override the default saveTab behavior
     * @return must at least have an unique id
     */
    saveTab?(tab: TabData): TabBase;
    /**
     * override the default loadTab behavior
     * - when loadTab is not defined, [[LayoutProps.defaultLayout]] will be used to find a tab to load, thus defaultLayout must contain the titles and contents for TabData
     * - when loadTab is defined, [[LayoutProps.defaultLayout]] can ignore all those and only keep id and other custom data
     */
    loadTab?(tab: TabBase): TabData;
    /**
     * modify the savedPanel, you can add additional data into the savedPanel
     */
    afterPanelSaved?(savedPanel: PanelBase, panel: PanelData): void;
    /**
     * modify the loadedPanel, you can retrieve additional data into the panel
     * - modifying panel tabs is allowed, make sure to add or replace full TabData with title and content, because loadTab won't be called after this
     * - if tabs is empty, but still remaining in layout because of panelLock, make sure also set the group if it's not null
     */
    afterPanelLoaded?(savedPanel: PanelBase, loadedPanel: PanelData): void;
    style?: React.CSSProperties;
    /**
     * when specified, docklayout will create a react portal for the maximized panel
     * use dom element as the value, or use the element's id
     */
    maximizeTo?: string | HTMLElement;
}
interface LayoutState {
    layout: LayoutData;
    /** @ignore */
    dropRect?: {
        left: number;
        width: number;
        top: number;
        height: number;
        element: HTMLElement;
        source?: any;
        direction?: DropDirection;
    };
}
declare class DockPortalManager extends React.PureComponent<LayoutProps, LayoutState> {
    /** @ignore */
    _caches: Map<string, TabPaneCache>;
    _pendingDestroy: any;
    _isMounted: boolean;
    destroyRemovedPane: () => void;
    /** @ignore */
    getTabCache(id: string, owner: any): TabPaneCache;
    /** @ignore */
    removeTabCache(id: string, owner: any): void;
    /** @ignore */
    updateTabCache(id: string, children: React.ReactNode): void;
}
export declare class DockLayout extends DockPortalManager implements DockContext {
    /** @ignore */
    _ref: HTMLDivElement;
    /** @ignore */
    getRef: (r: HTMLDivElement) => void;
    /** @ignore */
    getRootElement(): HTMLDivElement;
    /** @ignore */
    prepareInitData(data: LayoutData): LayoutData;
    /** @ignore */
    getDockId(): any;
    /** @inheritDoc */
    getGroup(name: string): TabGroup;
    /**
     * @inheritDoc
     * @param source @inheritDoc
     * @param target @inheritDoc
     * @param direction @inheritDoc
     * @param floatPosition @inheritDoc
     */
    dockMove(source: TabData | PanelData, target: string | TabData | PanelData | BoxData | null, direction: DropDirection, floatPosition?: FloatPosition): void;
    /** @inheritDoc */
    find(id: string | ((item: PanelData | TabData | BoxData) => boolean), filter?: Algorithm.Filter): PanelData | TabData | BoxData | undefined;
    /** @ignore */
    getLayoutSize(): LayoutSize;
    /** @inheritDoc */
    updateTab(id: string, newTab: TabData | null, makeActive?: boolean): boolean;
    /** @inheritDoc */
    navigateToPanel(fromElement?: HTMLElement, direction?: string): void;
    constructor(props: LayoutProps);
    /** @ignore */
    onDragStateChange: (draggingScope: any) => void;
    /** @ignore */
    useEdgeDrop(): boolean;
    /** @ignore */
    setDropRect(element: HTMLElement, direction?: DropDirection, source?: any, event?: {
        clientX: number;
        clientY: number;
    }, panelSize?: [number, number]): void;
    /** @ignore */
    render(): React.ReactNode;
    _onWindowResize: any;
    /** @ignore */
    panelToFocus: string;
    /** @ignore */
    componentDidMount(): void;
    /** @ignore
     * move focus to panelToFocus
     */
    componentDidUpdate(prevProps: Readonly<LayoutProps>, prevState: Readonly<LayoutState>, snapshot?: any): void;
    /** @ignore */
    componentWillUnmount(): void;
    /** @ignore
     * layout state doesn't change instantly after setState, use this to make sure the correct layout is
     */
    tempLayout: LayoutData;
    setLayout(layout: LayoutData): void;
    getLayout(): LayoutData;
    /** @ignore
     * change layout
     */
    changeLayout(layoutData: LayoutData, currentTabId: string, direction: DropDirection, silent?: boolean): void;
    /** @ignore
     * some layout change were handled by component silently
     * but they should still call this function to trigger onLayoutChange
     */
    onSilentChange(currentTabId?: string, direction?: DropDirection): void;
    saveLayout(): LayoutBase;
    /**
     * load layout
     * calling this api won't trigger the [[LayoutProps.onLayoutChange]] callback
     */
    loadLayout(savedLayout: LayoutBase): void;
    /** @ignore */
    static loadLayoutData(savedLayout: LayoutBase, props: LayoutProps, width?: number, height?: number): LayoutData;
    static getDerivedStateFromProps(props: LayoutProps, state: LayoutState): {
        layout: LayoutData;
    };
}
export {};
