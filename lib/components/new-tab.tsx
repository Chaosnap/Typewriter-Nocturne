import React, {useRef, useState} from 'react';

import useClickAway from 'react-use/lib/useClickAway';

import type {configOptions} from '../../typings/config';

interface Props {
  defaultProfile: string;
  profiles: configOptions['profiles'];
  openNewTab: (name: string) => void;
  backgroundColor: string;
  borderColor: string;
  tabsVisible: boolean;
}
const isMac = /Mac/.test(navigator.userAgent);

// [nocturne] A fresh sheet with a plus, drawn like the Nocturne toolbar icons, in place of a chevron.
const NewSheetIcon = () => (
  <svg className="new_tab_icon" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5 2.8h6.4L15 6.4v10.8H5z" />
    <path d="M11.4 2.8v3.6H15" opacity="0.55" />
    <path d="M10 9.2v5.6M7.2 12h5.6" />
  </svg>
);

const DropdownButton = ({defaultProfile, profiles, openNewTab, backgroundColor, borderColor, tabsVisible}: Props) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef(null);

  const toggleDropdown = () => {
    // [nocturne] With a single profile there is nothing to choose: open the tab at once.
    if (profiles.length <= 1) {
      openNewTab(profiles[0]?.name ?? defaultProfile);
      return;
    }
    setDropdownOpen(!dropdownOpen);
  };

  useClickAway(ref, () => {
    setDropdownOpen(false);
  });

  return (
    <div
      ref={ref}
      title="New tab"
      className={`new_tab ${tabsVisible ? 'tabs_visible' : 'tabs_hidden'}`}
      onClick={toggleDropdown}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={() => setDropdownOpen(false)}
    >
      <NewSheetIcon />

      {dropdownOpen && (
        <ul
          key="dropdown"
          className="profile_dropdown"
          style={{
            borderColor,
            backgroundColor
          }}
        >
          {profiles.map((profile) => (
            <li
              key={profile.name}
              onClick={() => {
                openNewTab(profile.name);
                setDropdownOpen(false);
              }}
              className={`profile_dropdown_item ${
                profile.name === defaultProfile && profiles.length > 1 ? 'profile_dropdown_item_default' : ''
              }`}
            >
              {profile.name}
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .profile_dropdown {
          border-width: 1px;
          border-style: solid;
          border-bottom-width: 0px;
          border-right-width: 0px;
          position: absolute;
          top: 33px;
          right: 0px;
          z-index: 1000;
          padding: 0px;
          margin: 0px;
          list-style-type: none;
          white-space: nowrap;
          min-width: 120px;
        }

        .profile_dropdown_item {
          padding: 0px 20px;
          height: 34px;
          line-height: 34px;
          cursor: pointer;
          font-size: 12px;
          color: #fff;
          background-color: transparent;
          border-width: 0px;
          border-style: solid;
          border-color: transparent;
          border-bottom-width: 1px;
          border-bottom-style: solid;
          border-bottom-color: ${borderColor};
          text-align: start;
          text-transform: capitalize;
        }

        .profile_dropdown_item:hover {
          background-color: ${borderColor};
        }

        .profile_dropdown_item_default {
          font-weight: bold;
        }

        .new_tab_icon {
          width: 16px;
          height: 16px;
          vertical-align: middle;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .new_tab {
          background: transparent;
          color: #fff;
          border-left: 1px;
          border-bottom: 1px;
          border-left-style: solid;
          border-bottom-style: solid;
          border-left-width: 1px;
          border-bottom-width: 1px;
          cursor: pointer;
          font-size: 12px;
          height: 34px;
          line-height: 34px;
          padding: 0 16px;
          position: relative;
          text-align: center;
          -webkit-user-select: none;
          ${isMac ? '-webkit-app-region: drag;' : ''}
          top: '0px';
        }

        .tabs_visible {
          border-color: ${borderColor};
        }

        .tabs_hidden {
          border-color: transparent;
          position: absolute;
          right: 0px;
        }

        .tabs_hidden:hover {
          border-color: ${borderColor};
        }
      `}</style>
    </div>
  );
};

export default DropdownButton;
