import { getEnabledRepositories } from "@/app/actions/workspace";
import WorkspaceClient from "./WorkspaceClient";

export default async function WorkspacePage() {
    const repos = await getEnabledRepositories();

    return (
        <div style={{ height: "calc(100vh - 4rem)", display: "flex", flexDirection: "column" }}>
            <WorkspaceClient initialRepos={repos} />
        </div>
    );
}
