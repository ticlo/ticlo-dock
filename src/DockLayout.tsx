import * as React from "react";
import * as ReactDOM from "react-dom";
import debounce from 'lodash/debounce';
import {
  BoxData,
  defaultGroup,
  DockContext,
  DockContextProvider,
  DropDirection,
  FloatPosition,
  LayoutBase,
  LayoutData,
  LayoutSize,
  PanelBase,
  PanelData,
  placeHolderGroup,
  placeHolderStyle,
  TabBase,
  TabData,
  TabGroup,
  TabPaneCache
} from "./DockData";
import {DockBox} from "./DockBox";
import {FloatBox} from "./FloatBox";
import {DockPanel} from "./DockPanel";
import * as Algorithm from "./Algorithm";
import * as Serializer from "./Serializer";
import * as DragManager from "./dragdrop/DragManager";
import {MaxBox} from "./MaxBox";
import {WindowBox} from "./WindowBox";

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
  groups?: {[key: string]: TabGroup};

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
  dropRect?: {left: number, width: number, top: number, height: number, element: HTMLElement, source?: any, direction?: DropDirection};
}

class DockPortalManager extends React.PureComponent<LayoutProps, LayoutState> {
  /** @ignore */
  _caches = new Map<string, TabPaneCache>();

  _pendingDestroy: any;

  _isMounted = false;

  destroyRemovedPane = () => {
    this._pendingDestroy = null;
    let cacheRemoved = false;
    for (let [id, cache] of this._caches) {
      if (cache.owner == null) {
        this._caches.delete(id);
        cacheRemoved = true;
      }
    }
    if (cacheRemoved && this._isMounted) {
      this.forceUpdate();
    }
  };


  /** @ignore */
  getTabCache(id: string, owner: any): TabPaneCache {
    let cache = this._caches.get(id);
    if (!cache) {
      let div = document.createElement('div');
      div.className = 'dock-pane-cache';
      cache = {div, id, owner};
      this._caches.set(id, cache);
    } else {
      cache.owner = owner;
    }

    return cache;
  }

  /** @ignore */
  removeTabCache(id: string, owner: any): void {
    let cache = this._caches.get(id);
    if (cache && cache.owner === owner) {
      cache.owner = null;
      if (!this._pendingDestroy) {
        // it could be reused by another component, so let's wait
        this._pendingDestroy = setTimeout(this.destroyRemovedPane, 1);
      }
    }
  }

  /** @ignore */
  updateTabCache(id: string, children: React.ReactNode): void {
    let cache = this._caches.get(id);
    if (cache) {
      cache.portal = ReactDOM.createPortal(children, cache.div, cache.id);
      this.forceUpdate();
    }
  }
}

export class DockLayout extends DockPortalManager implements DockContext {
  /** @ignore */
  _ref: HTMLDivElement;
  /** @ignore */
  getRef = (r: HTMLDivElement) => {
    this._ref = r;
  };

  /** @ignore */
  getRootElement() {
    return this._ref;
  }

  /** @ignore */
  prepareInitData(data: LayoutData): LayoutData {
    let layout = {...data};
    Algorithm.fixLayoutData(layout, this.props.groups, this.props.loadTab);
    return layout;
  }

  /** @ignore */
  getDockId(): any {
    return this.props.dockId || this;
  }

  /** @inheritDoc */
  getGroup(name: string) {
    if (name) {
      let {groups} = this.props;
      if (groups && name in groups) {
        return groups[name];
      }
      if (name === placeHolderStyle) {
        return placeHolderGroup;
      }
    }
    return defaultGroup;
  }

  /**
   * @inheritDoc
   * @param source @inheritDoc
   * @param target @inheritDoc
   * @param direction @inheritDoc
   * @param floatPosition @inheritDoc
   */
  dockMove(
    source: TabData | PanelData,
    target: string | TabData | PanelData | BoxData | null,
    direction: DropDirection,
    floatPosition?: FloatPosition
  ) {
    let layout = this.getLayout();
    if (direction === 'maximize') {
      layout = Algorithm.maximize(layout, source);
      this.panelToFocus = source.id;
    } else if (direction === 'front') {
      layout = Algorithm.moveToFront(layout, source);
    } else {
      layout = Algorithm.removeFromLayout(layout, source);
    }

    if (typeof target === 'string') {
      target = this.find(target, Algorithm.Filter.All);
    } else {
      target = Algorithm.getUpdatedObject(target); // target might change during removeTab
    }

    if (direction === 'float') {
      let newPanel = Algorithm.converToPanel(source);
      newPanel.z = Algorithm.nextZIndex(null);
      if (this.state.dropRect || floatPosition) {
        layout = Algorithm.floatPanel(layout, newPanel, this.state.dropRect || floatPosition);
      } else {
        layout = Algorithm.floatPanel(layout, newPanel);
        if (this._ref) {
          layout = Algorithm.fixFloatPanelPos(layout, this._ref.offsetWidth, this._ref.offsetHeight);
        }
      }
    } else if (direction === 'new-window') {
      let newPanel = Algorithm.converToPanel(source);
      layout = Algorithm.panelToWindow(layout, newPanel);
    } else if (target) {
      if ('tabs' in (target as PanelData)) {
        // panel target
        if (direction === 'middle') {
          layout = Algorithm.addTabToPanel(layout, source, target as PanelData);
          console.log("Panel A");
        } else {
          console.log("Panel B");
          let newPanel = Algorithm.converToPanel(source);
          layout = Algorithm.dockPanelToPanel(layout, newPanel, target as PanelData, direction);
        }

      } else if ('children' in (target as BoxData)) {
        // box target
        let newPanel = Algorithm.converToPanel(source);
        layout = Algorithm.dockPanelToBox(layout, newPanel, target as BoxData, direction);
      } else {
        // tab target
        layout = Algorithm.addNextToTab(layout, source, target as TabData, direction);
      }
    }
    if (layout !== this.getLayout()) {
      layout = Algorithm.fixLayoutData(layout, this.props.groups);
      const currentTabId: string = source.hasOwnProperty('tabs') ? (source as PanelData).activeId : (source as TabData).id;
      this.changeLayout(layout, currentTabId, direction);
    }
    this.onDragStateChange(false);
  }

  /** @inheritDoc */
  find(id: string, filter?: Algorithm.Filter): PanelData | TabData | BoxData | undefined {
    return Algorithm.find(this.getLayout(), id, filter);
  }

  /** @ignore */
  getLayoutSize(): LayoutSize {
    if (this._ref) {
      return {width: this._ref.offsetWidth, height: this._ref.offsetHeight};
    }
    return {width: 0, height: 0};
  }

  /** @inheritDoc */
  updateTab(id: string, newTab: TabData | null, makeActive: boolean = true): boolean {
    let tab = this.find(id, Algorithm.Filter.AnyTab) as TabData;
    if (!tab) {
      return false;
    }
    let panelData = tab.parent;
    let idx = panelData.tabs.indexOf(tab);
    if (idx >= 0) {
      let {loadTab} = this.props;
      let layout = this.getLayout();
      if (newTab) {
        let activeId = panelData.activeId;
        if (loadTab && !('content' in newTab && 'title' in newTab)) {
          newTab = loadTab(newTab);
        }
        layout = Algorithm.removeFromLayout(layout, tab); // remove old tab
        panelData = Algorithm.getUpdatedObject(panelData); // panelData might change during removeTab
        layout = Algorithm.addTabToPanel(layout, newTab, panelData, idx); // add new tab
        panelData = Algorithm.getUpdatedObject(panelData); // panelData might change during addTabToPanel
        if (!makeActive) {
          // restore the previous activeId
          panelData.activeId = activeId;
          this.panelToFocus = panelData.id;
        }
      } else if (makeActive && panelData.activeId !== id) {
        layout = Algorithm.replacePanel(layout, panelData, {...panelData, activeId: id});
      }

      layout = Algorithm.fixLayoutData(layout, this.props.groups);
      this.changeLayout(layout, newTab?.id ?? id, 'update');
      return true;
    }
  }

  /** @inheritDoc */
  navigateToPanel(fromElement?: HTMLElement, direction?: string) {
    if (!direction) {
      if (!fromElement) {
        fromElement = this._ref.querySelector('.dock-tab-active>.dock-tab-btn');
      }
      fromElement.focus();
      return;
    }
    let targetTab: HTMLElement;
    // use panel rect when move left/right, and use tabbar rect for up/down
    let selector = (direction === 'ArrowUp' || direction === 'ArrowDown') ?
      '.dock>.dock-bar' : '.dock-box>.dock-panel';
    let panels = Array.from(this._ref.querySelectorAll(selector));

    let currentPanel = panels.find((panel) => panel.contains(fromElement));
    let currentRect = currentPanel.getBoundingClientRect();
    let matches: any[] = [];
    for (let panel of panels) {
      if (panel !== currentPanel) {
        let rect = panel.getBoundingClientRect();
        let distance = Algorithm.findNearestPanel(currentRect, rect, direction);
        if (distance >= 0) {
          matches.push({panel, rect, distance});
        }
      }
    }
    matches.sort((a, b) => a.distance - b.distance);
    for (let match of matches) {
      targetTab = match.panel.querySelector('.dock-tab-active>.dock-tab-btn');
      if (targetTab) {
        break;
      }
    }

    if (targetTab) {
      targetTab.focus();
    }
  }

  constructor(props: LayoutProps) {
    super(props);
    let {layout, defaultLayout, loadTab} = props;
    let preparedLayout: LayoutData;
    if (defaultLayout) {
      preparedLayout = this.prepareInitData(props.defaultLayout);
    } else if (!loadTab) {
      throw new Error('DockLayout.loadTab and DockLayout.defaultLayout should not both be undefined.');
    }

    if (layout) {
      // controlled layout
      this.state = {
        layout: DockLayout.loadLayoutData(layout, props),
        dropRect: null,
      };
    } else {
      this.state = {
        layout: preparedLayout,
        dropRect: null,
      };
    }

    DragManager.addDragStateListener(this.onDragStateChange);
    globalThis.addEventListener?.('resize', this._onWindowResize);
  }

  /** @ignore */
  onDragStateChange = (draggingScope: any) => {
    if (draggingScope == null) {
      DockPanel.droppingPanel = null;
      if (this.state.dropRect) {
        this.setState({dropRect: null});
      }
    }
  };

  /** @ignore */
  useEdgeDrop() {
    return this.props.dropMode === 'edge';
  }

  /** @ignore */
  setDropRect(element: HTMLElement, direction?: DropDirection, source?: any, event?: {clientX: number, clientY: number}, panelSize: [number, number] = [300, 300]) {
    let {dropRect} = this.state;
    if (dropRect) {
      if (direction === 'remove') {
        if (dropRect.source === source) {
          this.setState({dropRect: null});
        }
        return;
      } else if (dropRect.element === element && dropRect.direction === direction && direction !== 'float') {
        // skip duplicated update except for float dragging
        return;
      }
    }
    if (!element) {
      this.setState({dropRect: null});
      return;
    }
    let layoutRect = this._ref.getBoundingClientRect();
    let scaleX = this._ref.offsetWidth / layoutRect.width;
    let scaleY = this._ref.offsetHeight / layoutRect.height;

    let elemRect = element.getBoundingClientRect();
    let left = (elemRect.left - layoutRect.left) * scaleX;
    let top = (elemRect.top - layoutRect.top) * scaleY;
    let width = elemRect.width * scaleX;
    let height = elemRect.height * scaleY;

    let ratio = 0.5;
    if (element.classList.contains('dock-box')) {
      ratio = 0.3;
    }

    if(direction === 'after-tab'){
      const navWidth = 30;
      const extraContentWidth = 30;

      // search parents until we find .dock-nav
      let parent = element.parentElement;
      while(parent && !parent.classList.contains('dock-nav')){
        parent = parent.parentElement;
      }

      if(parent){
        const parentRect = parent.getBoundingClientRect();
        // make sure left is lower then parent right
        left = Math.min(left, parentRect.right - navWidth - extraContentWidth - width);
      }
    }

    switch (direction) {
      case 'float': {
        let x = (event.clientX - layoutRect.left) * scaleX;
        let y = (event.clientY - layoutRect.top) * scaleY;
        top = y - 15;
        width = panelSize[0];
        height = panelSize[1];
        left = x - (width >> 1);
        break;
      }
      case 'right':
        left += width * (1 - ratio);
      case 'left': // tslint:disable-line no-switch-case-fall-through
        width *= ratio;
        break;
      case 'bottom':
        top += height * (1 - ratio);
      case 'top': // tslint:disable-line no-switch-case-fall-through
        height *= ratio;
        break;
      case 'after-tab':
        left += width - 15;
        width = 30;
        break;
      case 'before-tab':
        left -= 15;
        width = 30;
        break;
    }

    this.setState({dropRect: {left, top, width, height, element, source, direction}});
  }

  /** @ignore */
  render(): React.ReactNode {
    // clear tempLayout
    this.tempLayout = null;

    let {style, maximizeTo} = this.props;
    let {layout, dropRect} = this.state;
    let dropRectStyle: React.CSSProperties;
    if (dropRect) {
      let {element, direction, ...rect} = dropRect;
      dropRectStyle = {...rect, display: 'block'};
      if (direction === 'float') {
        dropRectStyle.transition = 'none';
      }
    }
    let maximize: React.ReactNode;
    // if (layout.maxbox && layout.maxbox.children.length === 1) {
    if (maximizeTo) {
      if (typeof maximizeTo === 'string') {
        maximizeTo = document.getElementById(maximizeTo);
      }
      maximize = ReactDOM.createPortal(
        <MaxBox boxData={layout.maxbox}/>,
        maximizeTo
      );
    } else {
      maximize = <MaxBox boxData={layout.maxbox}/>;
    }
    // }

    let portals: React.ReactPortal[] = [];
    for (let [key, cache] of this._caches) {
      if (cache.portal) {
        portals.push(cache.portal);
      }
    }

    return (
      <div ref={this.getRef} className="dock-layout" style={style}>
        <DockContextProvider value={this}>
          <DockBox size={1} boxData={layout.dockbox}/>
          <FloatBox boxData={layout.floatbox}/>
          <WindowBox boxData={layout.windowbox}/>
          {maximize}
          {portals}
        </DockContextProvider>
        <div className="dock-drop-indicator" style={dropRectStyle}/>
      </div>
    );
  }

  _onWindowResize: any = debounce(() => {
    let layout = this.getLayout();

    if (this._ref) {
      let newLayout = Algorithm.fixFloatPanelPos(layout, this._ref.offsetWidth, this._ref.offsetHeight);
      if (layout !== newLayout) {
        newLayout = Algorithm.fixLayoutData(newLayout, this.props.groups); // panel parent might need a fix
        this.changeLayout(newLayout, null, 'move');
      }
    }
  }, 200);


  /** @ignore */
  panelToFocus: string;

  /** @ignore */
  componentDidMount() {
    this._isMounted = true;
  }

  /** @ignore
   * move focus to panelToFocus
   */
  componentDidUpdate(prevProps: Readonly<LayoutProps>, prevState: Readonly<LayoutState>, snapshot?: any) {
    if (this.panelToFocus) {
      let panel = this._ref.querySelector(`.dock-panel[data-dockid="${this.panelToFocus}"]`) as HTMLElement;
      if (panel && !panel.contains(this._ref.ownerDocument.activeElement)) {
        (panel.querySelector('.dock-bar') as HTMLElement)?.focus();
      }
      this.panelToFocus = null;
    }
  }

  /** @ignore */
  componentWillUnmount(): void {
    globalThis.removeEventListener?.('resize', this._onWindowResize);
    DragManager.removeDragStateListener(this.onDragStateChange);
    this._onWindowResize.cancel();
    this._isMounted = false;
  }

  /** @ignore
   * layout state doesn't change instantly after setState, use this to make sure the correct layout is
   */
  tempLayout: LayoutData;

  setLayout(layout: LayoutData) {
    this.tempLayout = layout;
    this.setState({layout});
  }

  getLayout() {
    return this.tempLayout || this.state.layout;
  }

  /** @ignore
   * change layout
   */
  changeLayout(layoutData: LayoutData, currentTabId: string, direction: DropDirection, silent: boolean = false) {
    let {layout, onLayoutChange} = this.props;
    let savedLayout: LayoutBase;
    if (onLayoutChange) {
      savedLayout = Serializer.saveLayoutData(layoutData, this.props.saveTab, this.props.afterPanelSaved);
      layoutData.loadedFrom = savedLayout;
      onLayoutChange(savedLayout, currentTabId, direction);
      if (layout) {
        // if layout prop is defined, we need to force an update to make sure it's either updated or reverted back
        this.forceUpdate();
      }
    }
    if (!layout && !silent) {
      // uncontrolled layout when Props.layout is not defined
      this.setLayout(layoutData);
    }
  }

  /** @ignore
   * some layout change were handled by component silently
   * but they should still call this function to trigger onLayoutChange
   */
  onSilentChange(currentTabId: string = null, direction?: DropDirection) {
    let {onLayoutChange} = this.props;
    if (onLayoutChange) {
      let layout = this.getLayout();
      this.changeLayout(layout, currentTabId, direction, true);
    }
  }

  // public api

  saveLayout(): LayoutBase {
    return Serializer.saveLayoutData(this.getLayout(), this.props.saveTab, this.props.afterPanelSaved);
  }

  /**
   * load layout
   * calling this api won't trigger the [[LayoutProps.onLayoutChange]] callback
   */
  loadLayout(savedLayout: LayoutBase) {
    this.setLayout(DockLayout.loadLayoutData(savedLayout, this.props, this._ref.offsetWidth, this._ref.offsetHeight));
  }

  /** @ignore */
  static loadLayoutData(savedLayout: LayoutBase, props: LayoutProps, width = 0, height = 0): LayoutData {
    let {defaultLayout, loadTab, afterPanelLoaded, groups} = props;
    let layout = Serializer.loadLayoutData(
      savedLayout,
      defaultLayout,
      loadTab,
      afterPanelLoaded
    );
    layout = Algorithm.fixFloatPanelPos(layout, width, height);
    layout = Algorithm.fixLayoutData(layout, groups);
    layout.loadedFrom = savedLayout;
    return layout;
  }

  static getDerivedStateFromProps(props: LayoutProps, state: LayoutState) {
    let {layout: layoutToLoad} = props;
    let {layout: currentLayout} = state;
    if (layoutToLoad && layoutToLoad !== currentLayout.loadedFrom) {
      // auto reload on layout prop change
      return {
        layout: DockLayout.loadLayoutData(layoutToLoad, props),
      };
    }
    return null;
  }
}
