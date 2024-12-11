import React, { FC, useMemo } from "react";
import { render, waitFor, within } from "@testing-library/react";
import { MemoryRouter, MemoryRouterProps } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import DataSubmissionListFilters from "./DataSubmissionListFilters";
import { SearchParamsProvider } from "../Contexts/SearchParamsContext";
import {
  Context as AuthContext,
  ContextState as AuthContextState,
  Status as AuthContextStatus,
} from "../Contexts/AuthContext";
import { Column } from "../GenericTable";
import { ListSubmissionsResp } from "../../graphql";

jest.mock("../Contexts/OrganizationListContext", () => ({
  useOrganizationListContext: jest.fn(),
}));

type ParentProps = {
  initialEntries?: MemoryRouterProps["initialEntries"];
  userRole?: UserRole;
  children: React.ReactNode;
};

const TestParent: FC<ParentProps> = ({
  initialEntries = ["/"],
  userRole = "User",
  children,
}: ParentProps) => {
  const authContextValue = useMemo<AuthContextState>(
    () => ({
      status: AuthContextStatus.LOADED,
      isLoggedIn: true,
      user: {
        _id: "user1",
        role: userRole,
        organization: {
          orgID: "Org1",
          orgName: "Organization 1",
          status: "Active",
          createdAt: "",
          updateAt: "",
        },
        firstName: "Test",
        lastName: "User",
        userStatus: "Active",
        IDP: "login.gov",
        email: "test@example.com",
        dataCommons: [],
        createdAt: "",
        updateAt: "",
        studies: null,
      },
    }),
    [userRole]
  );

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={authContextValue}>
        <SearchParamsProvider>{children}</SearchParamsProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe("DataSubmissionListFilters Component", () => {
  const columns: Column<ListSubmissionsResp["listSubmissions"]["submissions"][0]>[] = [
    {
      field: "name",
      label: "Name",
      renderValue: (row) => row.name,
    },
    {
      field: "status",
      label: "Status",
      renderValue: (row) => row.status,
    },
  ];

  const submitterNames = ["Submitter1", "Submitter2"];
  const dataCommons = ["DataCommon1", "DataCommon2"];
  const columnVisibilityModel = { name: true, status: true };

  const mockOnChange = jest.fn();
  const mockOnColumnVisibilityModelChange = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("renders without crashing", async () => {
    const { getByTestId } = render(
      <TestParent>
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(getByTestId("data-submission-list-filters")).toBeInTheDocument();
    });
  });

  it("has no accessibility violations", async () => {
    const { container, getByTestId } = render(
      <TestParent userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(getByTestId("status-select")).toBeInTheDocument();
      expect(getByTestId("data-commons-select")).toBeInTheDocument();
      expect(getByTestId("submission-name-input")).toBeInTheDocument();
      expect(getByTestId("dbGaPID-input")).toBeInTheDocument();
      expect(getByTestId("submitter-name-select")).toBeInTheDocument();
      expect(getByTestId("reset-filters-button")).toBeInTheDocument();
      expect(getByTestId("column-visibility-button")).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders all input fields correctly", async () => {
    const { getByTestId } = render(
      <TestParent>
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(getByTestId("status-select")).toBeInTheDocument();
    });

    expect(getByTestId("data-commons-select")).toBeInTheDocument();
    expect(getByTestId("submission-name-input")).toBeInTheDocument();
    expect(getByTestId("dbGaPID-input")).toBeInTheDocument();
    expect(getByTestId("submitter-name-select")).toBeInTheDocument();
    expect(getByTestId("reset-filters-button")).toBeInTheDocument();
    expect(getByTestId("column-visibility-button")).toBeInTheDocument();
  });

  it("resets all filters and clears URL searchParams when reset button is clicked", async () => {
    const { getByTestId } = render(
      <TestParent userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    const statusSelect = within(getByTestId("status-select")).getByRole("button");

    userEvent.click(statusSelect);

    const statusSelectList = within(statusSelect.parentElement).getByRole("listbox", {
      hidden: true,
    });

    await waitFor(() => {
      expect(within(statusSelectList).getByTestId("status-option-All")).toBeInTheDocument();
      expect(within(statusSelectList).getByTestId("status-option-New")).toBeInTheDocument();
      expect(within(statusSelectList).getByTestId("status-option-Submitted")).toBeInTheDocument();
    });

    userEvent.click(within(statusSelectList).getByTestId("status-option-Submitted"));

    const dataCommonsSelect = within(getByTestId("data-commons-select")).getByRole("button");

    userEvent.click(dataCommonsSelect);

    const dataCommonsSelectList = within(dataCommonsSelect.parentElement).getByRole("listbox", {
      hidden: true,
    });

    await waitFor(() => {
      expect(
        within(dataCommonsSelectList).getByTestId("data-commons-option-All")
      ).toBeInTheDocument();
      expect(
        within(dataCommonsSelectList).getByTestId("data-commons-option-DataCommon1")
      ).toBeInTheDocument();
      expect(
        within(dataCommonsSelectList).getByTestId("data-commons-option-DataCommon2")
      ).toBeInTheDocument();
    });

    userEvent.click(within(dataCommonsSelectList).getByTestId("data-commons-option-DataCommon1"));

    userEvent.type(getByTestId("submission-name-input"), "Test Submission");
    userEvent.type(getByTestId("dbGaPID-input"), "12345");

    const submitterNameSelect = within(getByTestId("submitter-name-select")).getByRole("button");

    userEvent.click(submitterNameSelect);

    const submitterNameList = within(submitterNameSelect.parentElement).getByRole("listbox", {
      hidden: true,
    });

    await waitFor(() => {
      expect(
        within(submitterNameList).getByTestId("submitter-name-option-All")
      ).toBeInTheDocument();
      expect(
        within(submitterNameList).getByTestId("submitter-name-option-Submitter1")
      ).toBeInTheDocument();
      expect(
        within(submitterNameList).getByTestId("submitter-name-option-Submitter2")
      ).toBeInTheDocument();
    });

    userEvent.click(within(submitterNameList).getByTestId("submitter-name-option-Submitter1"));

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "Submitted",
          name: "Test Submission",
          dbGaPID: "12345",
          submitterName: "Submitter1",
          dataCommons: "DataCommon1",
        })
      );
    });

    userEvent.click(getByTestId("reset-filters-button"));

    await waitFor(() => {
      expect(getByTestId("status-select-input")).toHaveValue("All");
      expect(getByTestId("data-commons-select-input")).toHaveValue("All");
      expect(getByTestId("submission-name-input")).toHaveValue("");
      expect(getByTestId("dbGaPID-input")).toHaveValue("");
      expect(getByTestId("submitter-name-select-input")).toHaveValue("All");
    });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "All",
        dataCommons: "All",
        name: "",
        dbGaPID: "",
        submitterName: "All",
      })
    );
  });

  it("debounces onChange after entering 3 characters in 'name' input", async () => {
    const { getByTestId } = render(
      <TestParent userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    userEvent.type(getByTestId("submission-name-input"), "Tes");

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Tes",
        })
      );
    });

    userEvent.clear(getByTestId("submission-name-input"));
  });

  it("does not call additional onChange before entering 3 characters in 'name' input", async () => {
    const { getByTestId } = render(
      <TestParent userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    // Initial call
    expect(mockOnChange).toHaveBeenCalledTimes(1);

    userEvent.type(getByTestId("submission-name-input"), "T");

    await waitFor(
      () => {
        expect(mockOnChange).not.toHaveBeenCalledWith(
          expect.objectContaining({
            name: "T",
          })
        );
      },
      { timeout: 600 }
    );

    // Only initial call was made
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    userEvent.clear(getByTestId("submission-name-input"));
  });

  it("debounces onChange after entering 3 characters in 'dbGaPID' input", async () => {
    const { getByTestId } = render(
      <TestParent userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    // Type 3 characters
    userEvent.type(getByTestId("dbGaPID-input"), "123");

    // Wait for debounce
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dbGaPID: "123",
        })
      );
    });

    userEvent.clear(getByTestId("dbGaPID-input"));
  });

  it("does not call onChange before entering 3 characters in 'dbGaPID' input", async () => {
    const { getByTestId } = render(
      <TestParent userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    // Initial call
    expect(mockOnChange).toHaveBeenCalledTimes(1);

    userEvent.type(getByTestId("dbGaPID-input"), "12");

    await waitFor(
      () => {
        expect(mockOnChange).not.toHaveBeenCalledWith(
          expect.objectContaining({
            dbGaPID: "12",
          })
        );
      },
      { timeout: 600 }
    );

    // Only initial call was made
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    userEvent.clear(getByTestId("dbGaPID-input"));
  });

  it("calls onChange immediately when clearing 'name' input", async () => {
    const { getByTestId } = render(
      <TestParent userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    userEvent.type(getByTestId("submission-name-input"), "Tes");

    // Wait for debounce
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Tes",
        })
      );
    });

    userEvent.clear(getByTestId("submission-name-input"));

    // onChange should be called immediately
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "",
        })
      );
    });
  });

  it("calls onChange immediately when clearing 'dbGaPID' input", async () => {
    const { getByTestId } = render(
      <TestParent userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(getByTestId("dbGaPID-input")).toBeInTheDocument();
    });

    userEvent.type(getByTestId("dbGaPID-input"), "123");

    // Wait for debounce
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dbGaPID: "123",
        })
      );
    });

    userEvent.clear(getByTestId("dbGaPID-input"));

    // onChange should be called immediately
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dbGaPID: "",
        })
      );
    });
  });

  it("debounces onChange correctly for multiple fields", async () => {
    const { getByTestId } = render(
      <TestParent userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(getByTestId("submission-name-input")).toBeInTheDocument();
      expect(getByTestId("dbGaPID-input")).toBeInTheDocument();
    });

    userEvent.type(getByTestId("submission-name-input"), "Test");
    userEvent.type(getByTestId("dbGaPID-input"), "4567");

    // Wait for debounce
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test",
          dbGaPID: "4567",
        })
      );
    });

    userEvent.clear(getByTestId("submission-name-input"));
    userEvent.clear(getByTestId("dbGaPID-input"));
  });

  it("initializes form fields based on searchParams", async () => {
    const initialEntries = [
      "/?status=Submitted&dataCommons=DataCommon1&name=Test&dbGaPID=123&submitterName=Submitter1",
    ];

    const mockOnChange = jest.fn();
    const mockOnColumnVisibilityModelChange = jest.fn();

    const { getByTestId } = render(
      <TestParent initialEntries={initialEntries} userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(getByTestId("status-select-input")).toHaveValue("Submitted");
      expect(getByTestId("data-commons-select-input")).toHaveValue("DataCommon1");
      expect(getByTestId("submission-name-input")).toHaveValue("Test");
      expect(getByTestId("dbGaPID-input")).toHaveValue("123");
      expect(getByTestId("submitter-name-select-input")).toHaveValue("Submitter1");
    });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Submitted",
        dataCommons: "DataCommon1",
        name: "Test",
        dbGaPID: "123",
        submitterName: "Submitter1",
      })
    );

    userEvent.clear(getByTestId("dbGaPID-input"));
    userEvent.clear(getByTestId("submission-name-input"));
  });

  it("initializes form fields to default when searchParams are empty", async () => {
    const initialEntries = ["/"];

    const mockOnChange = jest.fn();
    const mockOnColumnVisibilityModelChange = jest.fn();

    const { getByTestId } = render(
      <TestParent initialEntries={initialEntries} userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(getByTestId("status-select-input")).toHaveValue("All");
      expect(getByTestId("data-commons-select-input")).toHaveValue("All");
      expect(getByTestId("submission-name-input")).toHaveValue("");
      expect(getByTestId("dbGaPID-input")).toHaveValue("");
      expect(getByTestId("submitter-name-select-input")).toHaveValue("All");
    });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "All",
        dataCommons: "All",
        name: "",
        dbGaPID: "",
        submitterName: "All",
      })
    );
  });

  it("calls onChange with getValues when all filters are not touched on initial render", async () => {
    const initialEntries = ["/"];

    const mockOnChange = jest.fn();
    const mockOnColumnVisibilityModelChange = jest.fn();

    render(
      <TestParent initialEntries={initialEntries} userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "All",
          dataCommons: "All",
          name: "",
          dbGaPID: "",
          submitterName: "All",
        })
      );
    });
  });

  it("sets dataCommons select to 'All' when dataCommons prop is empty", async () => {
    const initialEntries = ["/"];
    const mockOnChange = jest.fn();
    const mockOnColumnVisibilityModelChange = jest.fn();

    const { getByTestId, findByRole } = render(
      <TestParent initialEntries={initialEntries} userRole="Admin">
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={[]} // Empty dataCommons
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    userEvent.clear(getByTestId("dbGaPID-input"));
    userEvent.clear(getByTestId("submission-name-input"));

    await waitFor(() => {
      expect(getByTestId("data-commons-select-input")).toHaveValue("All");
      expect(getByTestId("data-commons-select")).toBeInTheDocument();
      expect(within(getByTestId("data-commons-select")).getByRole("button")).toBeInTheDocument();
    });

    const button = within(getByTestId("data-commons-select")).getByRole("button");
    userEvent.click(button);

    const dataCommonsList = await findByRole("listbox", { hidden: true });
    await waitFor(async () => {
      expect(within(dataCommonsList).getByTestId("data-commons-option-All")).toBeInTheDocument();
      expect(
        within(dataCommonsList).queryByTestId("data-commons-option-DataCommon1")
      ).not.toBeInTheDocument();
      expect(
        within(dataCommonsList).queryByTestId("data-commons-option-DataCommon2")
      ).not.toBeInTheDocument();
    });

    userEvent.click(button);
  });

  it("sets dataCommons select to field.value when dataCommons prop is non-empty", async () => {
    const mockOnChange = jest.fn();
    const mockOnColumnVisibilityModelChange = jest.fn();

    const { getByTestId, getByRole } = render(
      <TestParent>
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={submitterNames}
          dataCommons={["DataCommon1", "DataCommon2"]} // Non-empty dataCommons
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(getByTestId("data-commons-select-input")).toHaveValue("All");
    });

    const dataCommonsSelect = within(getByTestId("data-commons-select")).getByRole("button");
    userEvent.click(dataCommonsSelect);

    const dataCommonsList = within(getByRole("listbox", { hidden: true }));

    await waitFor(() => {
      expect(dataCommonsList.getByTestId("data-commons-option-DataCommon1")).toBeInTheDocument();
      expect(dataCommonsList.getByTestId("data-commons-option-DataCommon2")).toBeInTheDocument();
    });

    userEvent.click(getByTestId("data-commons-option-DataCommon1"));

    await waitFor(() => {
      expect(getByTestId("data-commons-select-input")).toHaveValue("DataCommon1");
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dataCommons: "DataCommon1",
        })
      );
    });
  });

  it("sets submitterNames select to 'All' when submitterNames prop is empty", async () => {
    const mockOnChange = jest.fn();
    const mockOnColumnVisibilityModelChange = jest.fn();

    const { getByTestId, getByRole } = render(
      <TestParent>
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={[]} // Empty submitterNames
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(getByTestId("submitter-name-select-input")).toHaveValue("All");
    });

    const submitterNameSelect = within(getByTestId("submitter-name-select")).getByRole("button");
    userEvent.click(submitterNameSelect);

    const submitterNameList = within(getByRole("listbox", { hidden: true }));

    await waitFor(() => {
      expect(submitterNameList.getByTestId("submitter-name-option-All")).toBeInTheDocument();
      expect(
        submitterNameList.queryByTestId("submitter-name-option-Submitter1")
      ).not.toBeInTheDocument();
      expect(
        submitterNameList.queryByTestId("submitter-name-option-Submitter2")
      ).not.toBeInTheDocument();
    });
  });

  it("sets submitterNames select to field.value when submitterNames prop is non-empty", async () => {
    const mockOnChange = jest.fn();
    const mockOnColumnVisibilityModelChange = jest.fn();

    const { getByTestId, getByRole } = render(
      <TestParent>
        <DataSubmissionListFilters
          columns={columns}
          submitterNames={["Submitter1", "Submitter2"]} // Non-empty submitterNames
          dataCommons={dataCommons}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={mockOnColumnVisibilityModelChange}
          onChange={mockOnChange}
        />
      </TestParent>
    );

    await waitFor(() => {
      expect(getByTestId("submitter-name-select-input")).toHaveValue("All");
    });

    const submitterNameSelect = within(getByTestId("submitter-name-select")).getByRole("button");
    userEvent.click(submitterNameSelect);

    const submitterNameList = within(getByRole("listbox", { hidden: true }));

    await waitFor(() => {
      expect(submitterNameList.getByTestId("submitter-name-option-Submitter1")).toBeInTheDocument();
      expect(submitterNameList.getByTestId("submitter-name-option-Submitter2")).toBeInTheDocument();
    });

    userEvent.click(getByTestId("submitter-name-option-Submitter1"));

    await waitFor(() => {
      expect(getByTestId("submitter-name-select-input")).toHaveValue("Submitter1");
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          submitterName: "Submitter1",
        })
      );
    });
  });
});
