import fs from "node:fs";
import path from "node:path";

const mode = process.argv[2] || "modern";
if (mode !== "modern" && mode !== "legacy") {
    throw new Error("Expected modern or legacy build mode.");
}
if (process.platform !== "win32") {
    throw new Error("Windows desktop packaging requires a Windows build runner.");
}

const project = path.resolve(import.meta.dirname, "..");
const source = path.join(project, "src-tauri", "tauri.conf.json");
const output = path.join(project, "src-tauri", "tauri-custom.conf.json");
const dist = path.join(project, "phoenix", "dist", "index.html");

if (!fs.existsSync(dist)) {
    throw new Error("Phoenix distribution is missing. Run npm run _ci-release:dev before packaging.");
}

const config = JSON.parse(fs.readFileSync(source, "utf8"));
config.build.distDir = "../phoenix/dist/";
config.package.productName = mode === "legacy" ? "Phoenix Code Fork Legacy" : "Phoenix Code Fork";
config.tauri.bundle.identifier = mode === "legacy" ? "dev.oonalang.phoenix.legacy" : "dev.oonalang.phoenix";
config.tauri.bundle.active = true;
config.tauri.bundle.targets = ["nsis"];
config.tauri.updater.active = false;
config.tauri.updater.endpoints = [];
config.tauri.bundle.windows.webviewInstallMode = mode === "legacy"
    ? {type: "embedBootstrapper"}
    : {type: "downloadBootstrapper"};
delete config.tauri.bundle.windows.certificateThumbprint;
delete config.tauri.bundle.windows.timestampUrl;
delete config.tauri.bundle.windows.digestAlgorithm;

for (const windowConfig of config.tauri.windows) {
    if (windowConfig.url && windowConfig.url.startsWith("phtauri://localhost/")) {
        windowConfig.url = windowConfig.url.replace("phtauri://localhost/", "https://phtauri.localhost/");
    }
    if (windowConfig.title === "Phoenix Code Fork") {
        windowConfig.title = config.package.productName;
    }
}

fs.writeFileSync(output, JSON.stringify(config, null, 4) + "\n");
console.log("Prepared", mode, "Windows build configuration:", output);
