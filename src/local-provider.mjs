import { join } from "path";
import { tmpdir } from "os";
import { SingleGroupProvider, asArray } from "repository-provider";
import { LocalRepository } from "./local-repository.mjs";
import { LocalBranch } from "./local-branch.mjs";

/**
 * Provider using native git executable
 * Known environment variables
 * - GIT_CLONE_OPTIONS
 * @property {string} workspace
 */
export class LocalProvider extends SingleGroupProvider {
  /**
   * Default configuration options
   * - workspace
   * - cloneOptions defaults to ["--depth", "10", "--no-single-branch"]
   * @return {Object}
   */
  static get attributes() {
    return {
      cloneOptions: {
        env: "GIT_CLONE_OPTIONS",
        set: value => typeof value != "object" ? value.split(/\s+/) : value,
        default: ["--depth", "10", "--no-single-branch"]
      },
      workspace: {
        default: tmpdir()
      }
    };
  }

  get repositoryClass() {
    return LocalRepository;
  }

  get branchClass() {
    return LocalBranch;
  }

  /**
   * Generate path for a new workspace
   * For the livetime of the provider always genrate new names
   * @return {string} path
   */
  newWorkspacePath() {
    return join(this.workspace, `r-${process.hrtime.bigint()}`);
  }

  normalizeRepositoryName(name) {
    name = name.trim();
    return name;
  }

  async *repositoryGroups(name) {
    console.log("X repositoryGroups", name);
    if (name !== undefined) {
      if (name.match("^(git|http)")) {
        yield this;
      }
    }
  }

  async *branches(pattern) {
    for (const name of asArray(pattern)) {
      console.log("X branches", name);
      if (name !== undefined) {
        if (name.match("^(git|http)")) {
          yield this.branch(name);
        }
      }
    }
  }

  /**
   * using provider workspace and number of repositories to create repository workspace
   * @param {string} name
   * @param {string} workspace where to place the repos workspace @see #newWorkspacePath
   */
  async repository(name, workspace) {
    if (name === undefined) {
      return undefined;
    }
    name = this.normalizeRepositoryName(name);
    if (name.length < 2) {
      return undefined;
    }

    console.log("REPOSITORY", name);

    let repository = this._repositories.get(name);
    if (repository === undefined) {
      try {
        repository = new this.repositoryClass(this, name, {
          workspace: workspace ? workspace : this.newWorkspacePath()
        });

        await repository.initialize();

        this._repositories.set(repository.name, repository);
      } catch {}
    }

    return repository;
  }

  async branch(name) {
    if (name === undefined) {
      return undefined;
    }

    const repository = await this.repository(name);

    console.log("BRANCH REPOSITORY", repository);

    if (repository === undefined) {
      return undefined;
    }

    const m = name.match(/#(.+)$/);

    return repository.branch(m ? m[1] : repository.defaultBranchName);
  }
}

export default LocalProvider;
