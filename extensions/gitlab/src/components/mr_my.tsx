import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { MergeRequest, Project } from "../gitlabapi";
import { daysInSeconds } from "../utils";
import { MRListItem, MRScope, MRState } from "./mr";
import { MyProjectsDropdown } from "./project";

/* eslint-disable @typescript-eslint/no-explicit-any */

function MyMRList(props: {
  mrs: MergeRequest[] | undefined;
  isLoading?: boolean | undefined;
  title?: string;
  performRefetch: () => void;
  searchText?: string | undefined;
  onSearchTextChange?: (text: string) => void;
  searchBarAccessory?:
    | boolean
    | React.ReactElement<List.Dropdown.Props, string | React.JSXElementConstructor<any>>
    | null
    | undefined;
}): JSX.Element {
  const mrs = props.mrs;

  if (!mrs) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const refresh = () => {
    props.performRefetch();
  };

  return (
    <List
      searchBarPlaceholder="Filter Merge Requests by name..."
      isLoading={props.isLoading}
      searchText={props.searchText}
      onSearchTextChange={props.onSearchTextChange}
      searchBarAccessory={props.searchBarAccessory}
    >
      <List.Section title={props.title} subtitle={mrs?.length.toString() || ""}>
        {mrs?.map((mr) => (
          <MRListItem key={mr.id} mr={mr} refreshData={refresh} showCIStatus={true} />
        ))}
      </List.Section>
    </List>
  );
}

export function MyMergeRequests(props: {
  scope: MRScope;
  state: MRState;
  searchText?: string | undefined;
  onSearchTextChange?: (text: string) => void;
}): JSX.Element {
  const scope = props.scope;
  const state = props.state;
  const [project, setProject] = useState<Project>();
  const { mrs: raw, isLoading, error, performRefetch } = useMyMergeRequests(scope, state, project);
  if (error) {
    showToast(Toast.Style.Failure, "Cannot search Merge Requests", error);
  }
  const mrs: MergeRequest[] | undefined = project ? raw?.filter((m) => m.project_id === project.id) : raw;
  const title =
    scope == MRScope.assigned_to_me ? "Your assigned Merge Requests" : "Your Recently Created Merge Requests";
  return (
    <MyMRList
      isLoading={isLoading}
      mrs={mrs}
      title={title}
      performRefetch={performRefetch}
      searchText={props.searchText}
      onSearchTextChange={props.onSearchTextChange}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
    />
  );
}

export function useMyMergeRequests(
  scope: MRScope,
  state: MRState,
  project: Project | undefined
): {
  mrs: MergeRequest[] | undefined;
  isLoading: boolean | undefined;
  error: string | undefined;
  performRefetch: () => void;
} {
  const {
    data: mrs,
    isLoading,
    error,
    performRefetch,
  } = useCache<MergeRequest[] | undefined>(
    `mymrs_${scope}_${state}`,
    async (): Promise<MergeRequest[] | undefined> => {
      return await gitlab.getMergeRequests({ state, scope });
    },
    {
      deps: [project, scope, state],
      secondsToRefetch: 10,
      secondsToInvalid: daysInSeconds(7),
    }
  );
  return { mrs, isLoading, error, performRefetch };
}
