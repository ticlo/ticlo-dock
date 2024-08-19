"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockLayout = void 0;
const React = __importStar(require("react"));
const ReactDOM = __importStar(require("react-dom"));
const debounce_1 = __importDefault(require("lodash/debounce"));
const DockData_1 = require("./DockData");
const DockBox_1 = require("./DockBox");
const FloatBox_1 = require("./FloatBox");
const DockPanel_1 = require("./DockPanel");
const Algorithm = __importStar(require("./Algorithm"));
const Serializer = __importStar(require("./Serializer"));
const DragManager = __importStar(require("./dragdrop/DragManager"));
const MaxBox_1 = require("./MaxBox");
const WindowBox_1 = require("./WindowBox");
class DockPortalManager extends React.PureComponent {
    constructor() {
        super(...arguments);
        /** @ignore */
        this._caches = new Map();
        this._isMounted = false;
        this.destroyRemovedPane = () => {
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
    }
    /** @ignore */
    getTabCache(id, owner) {
        let cache = this._caches.get(id);
        if (!cache) {
            let div = document.createElement('div');
            div.className = 'dock-pane-cache';
            cache = { div, id, owner };
            this._caches.set(id, cache);
        }
        else {
            cache.owner = owner;
        }
        return cache;
    }
    /** @ignore */
    removeTabCache(id, owner) {
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
    updateTabCache(id, children) {
        var _a;
        let cache = this._caches.get(id);
        if (cache) {
            if (Object.is((_a = cache.portal) === null || _a === void 0 ? void 0 : _a.children, children)) {
                return;
            }
            cache.portal = ReactDOM.createPortal(children, cache.div, cache.id);
            this.forceUpdate();
        }
    }
}
class DockLayout extends DockPortalManager {
    constructor(props) {
        var _a;
        super(props);
        /** @ignore */
        this.getRef = (r) => {
            this._ref = r;
        };
        /** @ignore */
        this.onDragStateChange = (draggingScope) => {
            if (draggingScope == null) {
                DockPanel_1.DockPanel.droppingPanel = null;
                if (this.state.dropRect) {
                    this.setState({ dropRect: null });
                }
            }
        };
        this._onWindowResize = debounce_1.default(() => {
            let layout = this.getLayout();
            if (this._ref) {
                let newLayout = Algorithm.fixFloatPanelPos(layout, this._ref.offsetWidth, this._ref.offsetHeight);
                if (layout !== newLayout) {
                    newLayout = Algorithm.fixLayoutData(newLayout, this.props.groups); // panel parent might need a fix
                    this.changeLayout(newLayout, null, 'move');
                }
            }
        }, 200);
        let { layout, defaultLayout, loadTab } = props;
        let preparedLayout;
        if (defaultLayout) {
            preparedLayout = this.prepareInitData(props.defaultLayout);
        }
        else if (!loadTab) {
            throw new Error('DockLayout.loadTab and DockLayout.defaultLayout should not both be undefined.');
        }
        if (layout) {
            // controlled layout
            this.state = {
                layout: DockLayout.loadLayoutData(layout, props),
                dropRect: null,
            };
        }
        else {
            this.state = {
                layout: preparedLayout,
                dropRect: null,
            };
        }
        DragManager.addDragStateListener(this.onDragStateChange);
        (_a = globalThis.addEventListener) === null || _a === void 0 ? void 0 : _a.call(globalThis, 'resize', this._onWindowResize);
    }
    /** @ignore */
    getRootElement() {
        return this._ref;
    }
    /** @ignore */
    prepareInitData(data) {
        let layout = Object.assign({}, data);
        Algorithm.fixLayoutData(layout, this.props.groups, this.props.loadTab);
        return layout;
    }
    /** @ignore */
    getDockId() {
        return this.props.dockId || this;
    }
    /** @inheritDoc */
    getGroup(name) {
        if (name) {
            let { groups } = this.props;
            if (groups && name in groups) {
                return groups[name];
            }
            if (name === DockData_1.placeHolderStyle) {
                return DockData_1.placeHolderGroup;
            }
        }
        return DockData_1.defaultGroup;
    }
    /**
     * @inheritDoc
     * @param source @inheritDoc
     * @param target @inheritDoc
     * @param direction @inheritDoc
     * @param floatPosition @inheritDoc
     */
    dockMove(source, target, direction, floatPosition) {
        let layout = this.getLayout();
        if (direction === 'maximize') {
            layout = Algorithm.maximize(layout, source);
            this.panelToFocus = source.id;
        }
        else if (direction === 'front') {
            layout = Algorithm.moveToFront(layout, source);
        }
        else {
            layout = Algorithm.removeFromLayout(layout, source);
        }
        if (typeof target === 'string') {
            target = this.find(target, Algorithm.Filter.All);
        }
        else {
            target = Algorithm.getUpdatedObject(target); // target might change during removeTab
        }
        if (direction === 'float') {
            let newPanel = Algorithm.converToPanel(source);
            newPanel.z = Algorithm.nextZIndex(null);
            if (this.state.dropRect || floatPosition) {
                layout = Algorithm.floatPanel(layout, newPanel, this.state.dropRect || floatPosition);
            }
            else {
                layout = Algorithm.floatPanel(layout, newPanel);
                if (this._ref) {
                    layout = Algorithm.fixFloatPanelPos(layout, this._ref.offsetWidth, this._ref.offsetHeight);
                }
            }
        }
        else if (direction === 'new-window') {
            let newPanel = Algorithm.converToPanel(source);
            layout = Algorithm.panelToWindow(layout, newPanel);
        }
        else if (target) {
            if ('tabs' in target) {
                // panel target
                if (direction === 'middle') {
                    layout = Algorithm.addTabToPanel(layout, source, target);
                }
                else {
                    let newPanel = Algorithm.converToPanel(source);
                    layout = Algorithm.dockPanelToPanel(layout, newPanel, target, direction);
                }
            }
            else if ('children' in target) {
                // box target
                let newPanel = Algorithm.converToPanel(source);
                layout = Algorithm.dockPanelToBox(layout, newPanel, target, direction);
            }
            else {
                // tab target
                layout = Algorithm.addNextToTab(layout, source, target, direction);
            }
        }
        if (layout !== this.getLayout()) {
            layout = Algorithm.fixLayoutData(layout, this.props.groups);
            const currentTabId = source.hasOwnProperty('tabs') ? source.activeId : source.id;
            this.changeLayout(layout, currentTabId, direction);
        }
        this.onDragStateChange(false);
    }
    /** @inheritDoc */
    find(id, filter) {
        return Algorithm.find(this.getLayout(), id, filter);
    }
    /** @ignore */
    getLayoutSize() {
        if (this._ref) {
            return { width: this._ref.offsetWidth, height: this._ref.offsetHeight };
        }
        return { width: 0, height: 0 };
    }
    /** @inheritDoc */
    updateTab(id, newTab, makeActive = true) {
        var _a;
        let tab = this.find(id, Algorithm.Filter.AnyTab);
        if (!tab) {
            return false;
        }
        let panelData = tab.parent;
        let idx = panelData.tabs.indexOf(tab);
        if (idx >= 0) {
            let { loadTab } = this.props;
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
            }
            else if (makeActive && panelData.activeId !== id) {
                layout = Algorithm.replacePanel(layout, panelData, Object.assign(Object.assign({}, panelData), { activeId: id }));
            }
            layout = Algorithm.fixLayoutData(layout, this.props.groups);
            this.changeLayout(layout, (_a = newTab === null || newTab === void 0 ? void 0 : newTab.id) !== null && _a !== void 0 ? _a : id, 'update');
            return true;
        }
    }
    /** @inheritDoc */
    navigateToPanel(fromElement, direction) {
        if (!direction) {
            if (!fromElement) {
                fromElement = this._ref.querySelector('.dock-tab-active>.dock-tab-btn');
            }
            fromElement.focus();
            return;
        }
        let targetTab;
        // use panel rect when move left/right, and use tabbar rect for up/down
        let selector = (direction === 'ArrowUp' || direction === 'ArrowDown') ?
            '.dock>.dock-bar' : '.dock-box>.dock-panel';
        let panels = Array.from(this._ref.querySelectorAll(selector));
        let currentPanel = panels.find((panel) => panel.contains(fromElement));
        let currentRect = currentPanel.getBoundingClientRect();
        let matches = [];
        for (let panel of panels) {
            if (panel !== currentPanel) {
                let rect = panel.getBoundingClientRect();
                let distance = Algorithm.findNearestPanel(currentRect, rect, direction);
                if (distance >= 0) {
                    matches.push({ panel, rect, distance });
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
    /** @ignore */
    useEdgeDrop() {
        return this.props.dropMode === 'edge';
    }
    /** @ignore */
    setDropRect(element, direction, source, event, panelSize = [300, 300]) {
        let { dropRect } = this.state;
        if (dropRect) {
            if (direction === 'remove') {
                if (dropRect.source === source) {
                    this.setState({ dropRect: null });
                }
                return;
            }
            else if (dropRect.element === element && dropRect.direction === direction && direction !== 'float') {
                // skip duplicated update except for float dragging
                return;
            }
        }
        if (!element) {
            this.setState({ dropRect: null });
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
        this.setState({ dropRect: { left, top, width, height, element, source, direction } });
    }
    /** @ignore */
    render() {
        // clear tempLayout
        this.tempLayout = null;
        let { style, maximizeTo } = this.props;
        let { layout, dropRect } = this.state;
        let dropRectStyle;
        if (dropRect) {
            let { element, direction } = dropRect, rect = __rest(dropRect, ["element", "direction"]);
            dropRectStyle = Object.assign(Object.assign({}, rect), { display: 'block' });
            if (direction === 'float') {
                dropRectStyle.transition = 'none';
            }
        }
        let maximize;
        // if (layout.maxbox && layout.maxbox.children.length === 1) {
        if (maximizeTo) {
            if (typeof maximizeTo === 'string') {
                maximizeTo = document.getElementById(maximizeTo);
            }
            maximize = ReactDOM.createPortal(React.createElement(MaxBox_1.MaxBox, { boxData: layout.maxbox }), maximizeTo);
        }
        else {
            maximize = React.createElement(MaxBox_1.MaxBox, { boxData: layout.maxbox });
        }
        // }
        let portals = [];
        for (let [key, cache] of this._caches) {
            if (cache.portal) {
                portals.push(cache.portal);
            }
        }
        return (React.createElement("div", { ref: this.getRef, className: "dock-layout", style: style },
            React.createElement(DockData_1.DockContextProvider, { value: this },
                React.createElement(DockBox_1.DockBox, { size: 1, boxData: layout.dockbox }),
                React.createElement(FloatBox_1.FloatBox, { boxData: layout.floatbox }),
                React.createElement(WindowBox_1.WindowBox, { boxData: layout.windowbox }),
                maximize,
                portals),
            React.createElement("div", { className: "dock-drop-indicator", style: dropRectStyle })));
    }
    /** @ignore */
    componentDidMount() {
        this._isMounted = true;
    }
    /** @ignore
     * move focus to panelToFocus
     */
    componentDidUpdate(prevProps, prevState, snapshot) {
        var _a;
        if (this.panelToFocus) {
            let panel = this._ref.querySelector(`.dock-panel[data-dockid="${this.panelToFocus}"]`);
            if (panel && !panel.contains(this._ref.ownerDocument.activeElement)) {
                (_a = panel.querySelector('.dock-bar')) === null || _a === void 0 ? void 0 : _a.focus();
            }
            this.panelToFocus = null;
        }
    }
    /** @ignore */
    componentWillUnmount() {
        var _a;
        (_a = globalThis.removeEventListener) === null || _a === void 0 ? void 0 : _a.call(globalThis, 'resize', this._onWindowResize);
        DragManager.removeDragStateListener(this.onDragStateChange);
        this._onWindowResize.cancel();
        this._isMounted = false;
    }
    setLayout(layout) {
        this.tempLayout = layout;
        this.setState({ layout });
    }
    getLayout() {
        return this.tempLayout || this.state.layout;
    }
    /** @ignore
     * change layout
     */
    changeLayout(layoutData, currentTabId, direction, silent = false) {
        let { layout, onLayoutChange } = this.props;
        let savedLayout;
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
    onSilentChange(currentTabId = null, direction) {
        let { onLayoutChange } = this.props;
        if (onLayoutChange) {
            let layout = this.getLayout();
            this.changeLayout(layout, currentTabId, direction, true);
        }
    }
    // public api
    saveLayout() {
        return Serializer.saveLayoutData(this.getLayout(), this.props.saveTab, this.props.afterPanelSaved);
    }
    /**
     * load layout
     * calling this api won't trigger the [[LayoutProps.onLayoutChange]] callback
     */
    loadLayout(savedLayout) {
        this.setLayout(DockLayout.loadLayoutData(savedLayout, this.props, this._ref.offsetWidth, this._ref.offsetHeight));
    }
    /** @ignore */
    static loadLayoutData(savedLayout, props, width = 0, height = 0) {
        let { defaultLayout, loadTab, afterPanelLoaded, groups } = props;
        let layout = Serializer.loadLayoutData(savedLayout, defaultLayout, loadTab, afterPanelLoaded);
        layout = Algorithm.fixFloatPanelPos(layout, width, height);
        layout = Algorithm.fixLayoutData(layout, groups);
        layout.loadedFrom = savedLayout;
        return layout;
    }
    static getDerivedStateFromProps(props, state) {
        let { layout: layoutToLoad } = props;
        let { layout: currentLayout } = state;
        if (layoutToLoad && layoutToLoad !== currentLayout.loadedFrom) {
            // auto reload on layout prop change
            return {
                layout: DockLayout.loadLayoutData(layoutToLoad, props),
            };
        }
        return null;
    }
}
exports.DockLayout = DockLayout;
