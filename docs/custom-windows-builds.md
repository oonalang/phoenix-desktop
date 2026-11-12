# Custom Windows builds

The desktop build uses the pinned commit of `oonalang/phoenix` from `package.json`.
The source repo supplies the editor and optional inline AI completion extension.

## Build from a phone

Open Actions in this repository, choose **Build Phoenix Windows installers**, then **Run workflow**.
Select **modern** for Windows 10/11 or **legacy** for an experimental Windows 8/8.1 package.
When the workflow completes successfully, download the `phoenix-windows-<target>` artifact.

Both variants generate unsigned NSIS installers. They do not use upstream updater endpoints.
The existing production workflows were not changed.

## Legacy Windows restrictions

The legacy variant uses the Tauri 1 installer with an embedded Evergreen WebView2 bootstrapper.
On Windows 8/8.1, Microsoft states that the Evergreen installer installs the last supported WebView2
Runtime version, 109. This version no longer receives security fixes.

Building an installer does not establish Windows 8 compatibility.
The native Tauri executable, bundled `phnode`/Node sidecar, native extensions, terminal, and
editor web features must be tested on actual Windows 8 and Windows 8.1 systems.
The current `phnode` downloader selects the latest release and does not pin a compatible
legacy Node.js build. Native features should be treated as unsupported until verified.

For troubleshooting, inspect the Actions run logs and test startup, file operations,
AI requests, extension loading, terminal, and live preview independently.
