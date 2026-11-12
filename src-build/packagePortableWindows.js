import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const variant = process.argv[2];
if (!["modern", "legacy"].includes(variant)) {
    throw new Error("Expected portable variant: modern or legacy.");
}

const releaseDir = path.join(root, "src-tauri", "target", "release");
const tauriDir = path.join(root, "src-tauri");
const executableNames = variant === "legacy"
    ? ["Phoenix Code Fork Legacy.exe", "phoenix-code-ide.exe"]
    : ["Phoenix Code Fork.exe", "phoenix-code-ide.exe"];
const appBinary = executableNames.map(name => path.join(releaseDir, name))
    .find(candidate => fs.existsSync(candidate));
if (!appBinary) {
    throw new Error("Tauri application executable not found. Checked: " + executableNames.join(", "));
}
const sourceNode = path.join(tauriDir, "src-node");
const sidecars = [
    path.join(tauriDir, "phnode-x86_64-pc-windows-msvc.exe"),
    path.join(releaseDir, "phnode.exe")
];
const sidecar = sidecars.find(item => fs.existsSync(item));
const destination = path.join(root, "dist", "portable", "phoenix-windows-" + variant);

function copyTree(from, to) {
    fs.mkdirSync(to, {recursive: true});
    console.log("Copying", from, "to", to);
    const result = spawnSync("robocopy", [
        from, to, "/E", "/R:1", "/W:1", "/MT:16", "/XJ", "/NFL", "/NDL", "/NJH", "/NJS"
    ], {stdio: "inherit"});
    if (result.error) {
        throw result.error;
    }
    if (result.status === null || result.status >= 8) {
        throw new Error("Robocopy failed with exit code " + result.status);
    }
    console.log("Copied:", to);
}

function requireFile(file, label) {
    if (!fs.statSync(file, {throwIfNoEntry: false})?.isFile()) {
        throw new Error(label + " is missing: " + file);
    }
}

requireFile(appBinary, "Windows application");
if (!sidecar) {
    throw new Error("Windows phnode sidecar is missing.");
}
requireFile(path.join(sourceNode, "package.json"), "Node backend");
if (!fs.existsSync(path.join(sourceNode, "node_modules"))) {
    throw new Error("Node backend dependencies are missing.");
}

fs.rmSync(destination, {recursive: true, force: true});
fs.mkdirSync(destination, {recursive: true});
fs.copyFileSync(appBinary, path.join(destination, "phoenix-code-ide.exe"));
fs.copyFileSync(sidecar, path.join(destination, "phnode.exe"));
copyTree(sourceNode, path.join(destination, "src-node"));

for (const item of fs.readdirSync(releaseDir, {withFileTypes: true})) {
    if (item.isFile() && item.name.toLowerCase().endsWith(".dll")) {
        fs.copyFileSync(path.join(releaseDir, item.name), path.join(destination, item.name));
    }
}

let fixedRuntimeIncluded = false;
const runtimeSource = path.join(tauriDir, "WebView2Runtime109");
if (variant === "legacy" && fs.existsSync(path.join(runtimeSource, "msedgewebview2.exe"))) {
    copyTree(runtimeSource, path.join(destination, "WebView2Runtime109"));
    fixedRuntimeIncluded = true;
}

const launch = [
    "@echo off",
    "setlocal",
    'set "PHOENIX_PORTABLE_ROOT=%~dp0"',
    'if not exist "%PHOENIX_PORTABLE_ROOT%Data\\WebView2" mkdir "%PHOENIX_PORTABLE_ROOT%Data\\WebView2"',
    'set "WEBVIEW2_USER_DATA_FOLDER=%PHOENIX_PORTABLE_ROOT%Data\\WebView2"',
    'if exist "%PHOENIX_PORTABLE_ROOT%WebView2Runtime109\\msedgewebview2.exe" set "WEBVIEW2_BROWSER_EXECUTABLE_FOLDER=%PHOENIX_PORTABLE_ROOT%WebView2Runtime109"',
    'start "" "%PHOENIX_PORTABLE_ROOT%phoenix-code-ide.exe" %*',
    "endlocal",
    ""
].join("\r\n");
fs.writeFileSync(path.join(destination, "Run Phoenix Portable.cmd"), launch);

const readme = [
    "PHOENIX CODE FORK - PORTABLE " + variant.toUpperCase(),
    "",
    "Extract the entire archive to a writable folder, then run:",
    "  Run Phoenix Portable.cmd",
    "",
    "No Phoenix installer is needed. Keep the exe, phnode.exe, and src-node folder together.",
    "The launcher stores WebView2 browser data under Data/WebView2 beside the exe.",
    "Editor preferences and other application data may still use your Windows user profile.",
    "",
    variant === "legacy"
        ? "Windows 8 / 8.1 compatibility is EXPERIMENTAL and untested."
        : "Intended for Windows 10 and Windows 11.",
    variant === "legacy"
        ? "Requires a compatible WebView2 runtime (version 109 is the last version for Windows 8/8.1)."
        : "Requires a functioning system WebView2 runtime, normally provided on modern Windows.",
    variant === "legacy"
        ? (fixedRuntimeIncluded
            ? "An optional WebView2Runtime109 folder is included. The launcher selects it."
            : "No WebView2Runtime109 folder is bundled. Install WebView2 109 separately, or place its official extracted x64 fixed runtime in WebView2Runtime109 beside the exe.")
        : "If WebView2 is missing, install the supported Microsoft WebView2 runtime.",
    "",
    "Legacy operating systems and WebView2 109 no longer receive security updates.",
    "The native Rust/Tauri shell, Node sidecar, and terminal remain unverified on Windows 8/8.1.",
    "Do not run the application exe by itself without the accompanying folders.",
    "AI inline completion stays off until enabled and configured by the user.",
    ""
].join("\r\n");
fs.writeFileSync(path.join(destination, "README-PORTABLE.txt"), readme);
requireFile(path.join(destination, "phoenix-code-ide.exe"), "Packaged application");
requireFile(path.join(destination, "phnode.exe"), "Packaged Node sidecar");
requireFile(path.join(destination, "src-node", "package.json"), "Packaged Node backend");
console.log("Portable package staged:", destination);
console.log("Fixed WebView2 runtime included:", fixedRuntimeIncluded);
