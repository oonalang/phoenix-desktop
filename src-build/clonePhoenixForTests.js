import {$} from "execa";
import fs from "fs";
import path from "path";

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).phoenixRepo;
const directory = path.resolve(root, "..", "phoenix");

if (!fs.existsSync(directory)) {
    await $`git clone --branch ${config.branch} ${config.gitClonrUrl} ${directory}`;
} else {
    await $`git -C ${directory} remote set-url origin ${config.gitClonrUrl}`;
}

await $`git -C ${directory} fetch --no-tags origin ${config.branch}`;
await $`git -C ${directory} checkout --detach ${config.commit}`;
console.log("Phoenix test source:", config.gitClonrUrl, config.commit);
