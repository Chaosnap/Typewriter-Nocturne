// [nocturne] "Open TypeNoc here" in the Windows 11 File Explorer context menu.
//
// Windows 11 shows only packaged IExplorerCommand handlers at the top level of its new context
// menu; classic registry verbs move under "Show more options". This DLL is that handler. The
// sparse package in AppxManifest.xml (same folder) gives it the package identity Windows asks for,
// with the app's install folder as its external location. Invoking the command starts
// "Typewriter Nocturne.exe --cwd=<folder>" for the folder clicked, the folder whose background
// was clicked, or the drive. Built on GitHub Actions by bin/ci/build-context-menu.ps1.

#include <windows.h>
#include <shellapi.h>
#include <shlguid.h>
#include <shlobj_core.h>
#include <shlwapi.h>
#include <shobjidl_core.h>
#include <wrl/client.h>
#include <wrl/implements.h>
#include <wrl/module.h>

#include <string>

using Microsoft::WRL::ClassicCom;
using Microsoft::WRL::ComPtr;
using Microsoft::WRL::InProc;
using Microsoft::WRL::Module;
using Microsoft::WRL::RuntimeClass;
using Microsoft::WRL::RuntimeClassFlags;

namespace {

// The DLL lives in <install folder>\resources\context-menu\; the app two folders up.
std::wstring AppPath() {
  HMODULE self = nullptr;
  GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                     reinterpret_cast<LPCWSTR>(&AppPath), &self);
  wchar_t path[MAX_PATH] = {};
  if (GetModuleFileNameW(self, path, MAX_PATH) == 0) {
    return L"";
  }
  for (int up = 0; up < 3; ++up) {
    PathRemoveFileSpecW(path);
  }
  std::wstring app(path);
  app += L"\\Typewriter Nocturne.exe";
  return app;
}

// The folder Explorer shows, for a click on its background (no item is selected then).
std::wstring FolderFromSite(IUnknown* site) {
  if (site == nullptr) {
    return L"";
  }
  ComPtr<IServiceProvider> services;
  ComPtr<IShellBrowser> browser;
  ComPtr<IShellView> view;
  ComPtr<IFolderView> folderView;
  ComPtr<IShellItem> folder;
  if (FAILED(site->QueryInterface(IID_PPV_ARGS(&services))) ||
      FAILED(services->QueryService(SID_STopLevelBrowser, IID_PPV_ARGS(&browser))) ||
      FAILED(browser->QueryActiveShellView(&view)) || FAILED(view.As(&folderView)) ||
      FAILED(folderView->GetFolder(IID_PPV_ARGS(&folder)))) {
    return L"";
  }
  PWSTR path = nullptr;
  if (FAILED(folder->GetDisplayName(SIGDN_FILESYSPATH, &path))) {
    return L"";
  }
  std::wstring result(path);
  CoTaskMemFree(path);
  return result;
}

std::wstring FirstItem(IShellItemArray* items) {
  DWORD count = 0;
  if (items == nullptr || FAILED(items->GetCount(&count)) || count == 0) {
    return L"";
  }
  ComPtr<IShellItem> item;
  PWSTR path = nullptr;
  if (FAILED(items->GetItemAt(0, &item)) || FAILED(item->GetDisplayName(SIGDN_FILESYSPATH, &path))) {
    return L"";
  }
  std::wstring result(path);
  CoTaskMemFree(path);
  return result;
}

}  // namespace

class __declspec(uuid("12531877-688C-4311-BF1C-E9FA8A122A48")) OpenTypeNocHere final
    : public RuntimeClass<RuntimeClassFlags<ClassicCom>, IExplorerCommand, IObjectWithSite> {
 public:
  IFACEMETHODIMP GetTitle(IShellItemArray*, PWSTR* name) override {
    return SHStrDupW(L"Open TypeNoc here", name);
  }

  IFACEMETHODIMP GetIcon(IShellItemArray*, PWSTR* icon) override {
    const std::wstring app = AppPath();
    return app.empty() ? E_FAIL : SHStrDupW((app + L",0").c_str(), icon);
  }

  IFACEMETHODIMP GetToolTip(IShellItemArray*, PWSTR* tip) override {
    *tip = nullptr;
    return E_NOTIMPL;
  }

  IFACEMETHODIMP GetCanonicalName(GUID* name) override {
    *name = __uuidof(OpenTypeNocHere);
    return S_OK;
  }

  IFACEMETHODIMP GetState(IShellItemArray*, BOOL, EXPCMDSTATE* state) override {
    *state = ECS_ENABLED;
    return S_OK;
  }

  IFACEMETHODIMP Invoke(IShellItemArray* items, IBindCtx*) override {
    std::wstring folder = FirstItem(items);
    if (folder.empty()) {
      folder = FolderFromSite(site_.Get());
    }
    const std::wstring app = AppPath();
    if (folder.empty() || app.empty()) {
      return E_FAIL;
    }
    // A trailing backslash (a drive, "C:\") would escape the closing quote.
    if (folder.back() == L'\\') {
      folder.pop_back();
    }
    const std::wstring arguments = L"\"--cwd=" + folder + L"\"";
    const HINSTANCE started =
        ShellExecuteW(nullptr, L"open", app.c_str(), arguments.c_str(), folder.c_str(), SW_SHOWNORMAL);
    return reinterpret_cast<INT_PTR>(started) > 32 ? S_OK : E_FAIL;
  }

  IFACEMETHODIMP GetFlags(EXPCMDFLAGS* flags) override {
    *flags = ECF_DEFAULT;
    return S_OK;
  }

  IFACEMETHODIMP EnumSubCommands(IEnumExplorerCommand** commands) override {
    *commands = nullptr;
    return E_NOTIMPL;
  }

  IFACEMETHODIMP SetSite(IUnknown* site) override {
    site_ = site;
    return S_OK;
  }

  IFACEMETHODIMP GetSite(REFIID riid, void** site) override {
    return site_.CopyTo(riid, site);
  }

 private:
  ComPtr<IUnknown> site_;
};

CoCreatableClass(OpenTypeNocHere)

STDAPI DllGetClassObject(REFCLSID clsid, REFIID riid, void** object) {
  return Module<InProc>::GetModule().GetClassObject(clsid, riid, object);
}

STDAPI DllCanUnloadNow() {
  return Module<InProc>::GetModule().GetObjectCount() == 0 ? S_OK : S_FALSE;
}
