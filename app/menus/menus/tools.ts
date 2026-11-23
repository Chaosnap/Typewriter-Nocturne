import type {BrowserWindow, MenuItemConstructorOptions} from 'electron';

const toolsMenu = (
  commands: Record<string, string>,
  execCommand: (command: string, focusedWindow?: BrowserWindow) => void
): MenuItemConstructorOptions => {
  return {
    label: 'Tools',
    submenu: [
      {
        label: 'Update plugins',
        accelerator: commands['plugins:update'],
        click() {
          execCommand('plugins:update');
        }
      },
      {
        label: 'Install `nocturne` command in PATH',
        click() {
          execCommand('cli:install');
        }
      },
      {
        type: 'separator'
      },
      ...(process.platform === 'win32'
        ? <MenuItemConstructorOptions[]>[
            {
              label: 'Add “Open TypeNoc here” to File Explorer',
              click() {
                execCommand('systemContextMenu:add');
              }
            },
            {
              label: 'Remove “Open TypeNoc here” from File Explorer',
              click() {
                execCommand('systemContextMenu:remove');
              }
            },
            {
              type: 'separator'
            }
          ]
        : [])
    ]
  };
};

export default toolsMenu;
