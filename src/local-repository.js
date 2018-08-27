import { Repository } from "repository-provider";
import execa from "execa";

const { stat } = require("fs").promises;

/**
 * @property {string} workspace
 */
export class LocalRepository extends Repository {
  get execOptions() {
    return { cwd: this.workspace };
  }

  /**
   * exec git clone or git pull
   * @param {string} workspace
   */
  async _initialize(workspace) {
    Object.defineProperty(this, "workspace", { value: workspace });
    await super._initialize();
    try {
      await stat(this.workspace);

      const remoteResult = await execa(
        "git",
        ["remote", "-v"],
        this.execOptions
      );
      console.log(remoteResult.stdout);
      const m = remoteResult.stdout.match(/origin\s+([^\s]+)\s+/);
      if (m && m[1] === this.name) {
        const result = await execa("git", ["pull"], this.execOptions);
      } else {
        throw new Error(`Unknown content in ${this.workspace}`);
      }
    } catch (e) {
      if (e.code === "ENOENT") {
        const result = await execa("git", ["clone", this.name, this.workspace]);
      } else {
        throw e;
      }
    }
    await this.initializeBranches();
  }

  async initializeBranches() {
    const result = await execa("git", ["branch", "--list"], {
      cwd: this.workspace
    });

    result.stdout.split(/\n/).forEach(b => {
      const m = b.match(/^(\*\s+)?([^\s]+)/);
      if (m) {
        const name = m[2];
        const branch = new this.provider.branchClass(this, name);
        this._branches.set(branch.name, branch);
      }
    });
  }

  get urls() {
    return [this.name];
  }

  async push() {
    return execa("git", ["push"], this.execOptions);
  }

  async createBranch(name, from) {
    const result = await execa(
      "git",
      ["checkout", "-b", name],
      this.execOptions
    );

    const b = new this.provider.branchClass(this, name);
    this._branches.set(b.name, b);
    return b;
  }

  async deleteBranch(name) {
    await execa("git", ["checkout", "master"], this.execOptions);
    const result = await execa("git", ["branch", "-D", name], this.execOptions);

    this._branches.delete(name);
  }
}
