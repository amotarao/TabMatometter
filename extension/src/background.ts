/**
 * タブを並べ替え
 */
const main: Parameters<typeof chrome.action.onClicked.addListener>[0] = async () => {
  const tabs = await getAllTabs();
  const groups = separateTabsByGroup(tabs);
  for (const group of groups) {
    await sortTabs(group);
  }
};

/**
 * 現在のウィンドウのすべてのタブを取得
 */
const getAllTabs = async (): Promise<chrome.tabs.Tab[]> => {
  const options = {
    currentWindow: true,
  };
  const tabs = await chrome.tabs.query(options);
  return tabs;
};

/**
 * グループIDごとにタブを分類
 */
const separateTabsByGroup = (tabs: chrome.tabs.Tab[]): { groupId: number, tabs: chrome.tabs.Tab[] }[] => {
  const groupIdsSet = new Set<number>();
  tabs.forEach((tab) => {
    groupIdsSet.add(tab.groupId);
  });
  const groupIds = [...groupIdsSet];

  const groups = groupIds.map((groupId) => {
    return {
      groupId,
      tabs: tabs.filter((tab) => tab.groupId === groupId),
    };
  });
  return groups;
};

/**
 * 指定したタブの現在のインデックスを取得
 */
const getTabIndex = async (tabId: number): Promise<number> => {
  const options = {
    currentWindow: true,
  };
  const tabs = await chrome.tabs.query(options);
  return tabs.findIndex((tab) => tab.id === tabId);
};

/**
 * グループごとにタブの並べ替え
 */
const sortTabs = async (group: { groupId: number, tabs: chrome.tabs.Tab[] }): Promise<void> => {
  const originsSet = new Set<string>();
  let offset = Infinity;

  const tabs = await Promise.all(
    group.tabs.map(async (tab) => {
      const url = tab.url || '';
      const origin = new URL(url).origin;
      originsSet.add(origin);

      const index = await getTabIndex(tab.id!);

      offset = Math.min(index, offset);

      return {
        url,
        origin,
        tabId: tab.id!,
        index: index,
        newIndex: -1,
      };
    })
  );

  const origins = [...originsSet];

  tabs.sort((tabA, tabB) => {
    const indexA = origins.indexOf(tabA.origin);
    const indexB = origins.indexOf(tabB.origin);
    return indexA - indexB;
  });
  tabs.forEach((tab, i) => {
    tab.newIndex = i + offset;
  });

  Promise.all(
    tabs.map(async (tab, i) => {
      if (tab.index === tab.newIndex) {
        return;
      }
      await chrome.tabs.move(tab.tabId, { index: tab.newIndex });
    })
  );
};

chrome.action.onClicked.addListener(main);
