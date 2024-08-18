import * as React from "react";
import {DragDropDiv} from "./dragdrop/DragDropDiv";
import * as DragManager from "./dragdrop/DragManager";
import type {TabNavListProps} from "rc-tabs/lib/TabNavList";
import {DockContextType} from "./DockData";

/**
 * @return returns true if navigation is handled in local tab move, otherwise returns false
 */
function checkLocalTabMove(key: string, tabbar: HTMLDivElement): boolean {
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    let tabs = Array.from(tabbar.querySelectorAll('.dock-tab-btn'));
    let activeTab = tabbar.querySelector('.dock-tab-active>.dock-tab-btn');
    let i = tabs.indexOf(activeTab);
    if (i >= 0) {
      if (key === 'ArrowLeft') {
        if (i > 0) {
          (tabs[i - 1] as HTMLElement).click();
          (tabs[i - 1] as HTMLElement).focus();
          return true;
        }
      } else {
        if (i < tabs.length - 1) {
          (tabs[i + 1] as HTMLElement).click();
          (tabs[i + 1] as HTMLElement).focus();
          return true;
        }
      }
    }
  }
  return false;
}


interface DockTabBarProps extends TabNavListProps {
  isMaximized: boolean;
  onDragStart?: DragManager.DragHandler;
  onDragMove?: DragManager.DragHandler;
  onDragEnd?: DragManager.DragHandler;
  onDragOver?: DragManager.DragHandler;
  onDrop?: DragManager.DropHandler;
  TabNavList: React.ComponentType<TabNavListProps>;
}

export function DockTabBar(props: DockTabBarProps) {
  const {
    onDragStart, onDragMove, onDragEnd, onDragOver, onDrop, TabNavList, isMaximized,
    ...restProps
  } = props;

  const layout = React.useContext(DockContextType);

  const ref = React.useRef<HTMLDivElement>();
  const getRef = (div: HTMLDivElement) => {
    ref.current = div;
  };


  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key.startsWith('Arrow')) {
      if (!checkLocalTabMove(e.key, ref.current) && !isMaximized) {
        layout.navigateToPanel(ref.current, e.key);
      }
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return (
    <DragDropDiv onDragStartT={onDragStart}
                 onDragMoveT={onDragMove}
                 onDragEndT={onDragEnd}
                 onDragOverT={onDragOver}
                 onDropT={onDrop}
                 role="tablist"
                 className="dock-bar"
                 onKeyDown={onKeyDown}
                 getRef={getRef}
                 tabIndex={-1}
    >
      <TabNavList {...restProps}/>
    </DragDropDiv>
  );
}
