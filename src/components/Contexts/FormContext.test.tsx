import React, { FC } from 'react';
import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { Status as FormStatus, FormProvider, useFormContext } from "./FormContext";
import { query as GET_APP } from '../../graphql/getApplication';
import { query as GET_LAST_APP } from '../../graphql/getMyLastApplication';

type Props = {
  appId: string;
  mocks?: MockedResponse[];
  children?: React.ReactNode;
};

const TestChild: FC = () => {
  const { status, data, error } = useFormContext();

  if (status === FormStatus.LOADING) {
    return null;
  }

  return (
    <>
      {/* Generic Context Details  */}
      {status && <div data-testid="status">{status}</div>}
      {error && <div data-testid="error">{error}</div>}

      {/* API Data */}
      {data?._id && <div data-testid="app-id">{data._id}</div>}
      {(typeof data?.pi?.firstName === "string") && <div data-testid="pi-first-name">{data.pi.firstName}</div>}
      {(typeof data?.pi?.lastName === "string") && <div data-testid="pi-last-name">{data.pi.lastName}</div>}
    </>
  );
};

const TestParent: FC<Props> = ({ mocks, appId, children } : Props) => (
  <MockedProvider mocks={mocks}>
    <FormProvider id={appId}>
      {children ?? <TestChild />}
    </FormProvider>
  </MockedProvider>
);

describe("FormContext tests", () => {
  it("should return an error for empty IDs", async () => {
    const screen = render(<TestParent appId="" />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());

    expect(screen.getByTestId("status").textContent).toEqual(FormStatus.ERROR);
    expect(screen.getByTestId("error").textContent).toEqual("Invalid application ID provided");
  });

  it("should return an error for graphql-based failures", async () => {
    const mocks = [{
      request: {
        query: GET_APP,
        variables: {
          id: "556ac14a-f247-42e8-8878-8468060fb49a",
        },
      },
      result: {
        errors: [new GraphQLError("Test GraphQL error")],
      },
    }];
    const screen = render(<TestParent mocks={mocks} appId="556ac14a-f247-42e8-8878-8468060fb49a" />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());

    expect(screen.getByTestId("status").textContent).toEqual(FormStatus.ERROR);
    expect(screen.getByTestId("error").textContent).toEqual("An unknown API or GraphQL error occurred");
  });

  it("should return an error for network-based failures", async () => {
    const mocks = [{
      request: {
        query: GET_APP,
        variables: {
          id: "556ac14a-f247-42e8-8878-8468060fb49a",
        },
      },
      error: new Error("Test network error"),
    }];
    const screen = render(<TestParent mocks={mocks} appId="556ac14a-f247-42e8-8878-8468060fb49a" />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());

    expect(screen.getByTestId("status").textContent).toEqual(FormStatus.ERROR);
    expect(screen.getByTestId("error").textContent).toEqual("An unknown API or GraphQL error occurred");
  });

  it("should return data for nominal requests", async () => {
    const mocks = [{
      request: {
        query: GET_APP,
        variables: {
          id: "556ac14a-f247-42e8-8878-8468060fb49a",
        },
      },
      result: {
        data: {
          getApplication: {
            _id: "556ac14a-f247-42e8-8878-8468060fb49a",
            pi: {
              firstName: "Successfully",
              lastName: "Fetched",
            },
          },
        },
      },
    }];
    const screen = render(<TestParent mocks={mocks} appId="556ac14a-f247-42e8-8878-8468060fb49a" />);

    await waitFor(() => expect(screen.getByTestId("status")).toBeInTheDocument());

    expect(screen.getByTestId("status").textContent).toEqual(FormStatus.LOADED);
    expect(screen.getByTestId("app-id").textContent).toEqual("556ac14a-f247-42e8-8878-8468060fb49a");
    expect(screen.getByTestId("pi-first-name").textContent).toEqual("Successfully");
    expect(screen.getByTestId("pi-last-name").textContent).toEqual("Fetched");
  });

  it("should autofill the user's last application for new submissions", async () => {
    const mocks = [{
      request: {
        query: GET_LAST_APP,
      },
      result: {
        data: {
          getMyLastApplication: {
            pi: {
              firstName: "Test",
              lastName: "User",
            },
          },
        },
      },
    }];
    const screen = render(<TestParent mocks={mocks} appId="new" />);

    await waitFor(() => expect(screen.getByTestId("status")).toBeInTheDocument());

    expect(screen.getByTestId("status").textContent).toEqual(FormStatus.LOADED);
    expect(screen.getByTestId("app-id").textContent).toEqual("new");
    expect(screen.getByTestId("pi-first-name").textContent).toEqual("Test");
    expect(screen.getByTestId("pi-last-name").textContent).toEqual("User");
  });

  it("should default to an empty string when no autofill information is returned", async () => {
    const mocks = [{
      request: {
        query: GET_LAST_APP,
      },
      result: {
        data: {
          getMyLastApplication: null,
        },
      },
      errors: [new GraphQLError("The user has no previous applications")],
    }];
    const screen = render(<TestParent mocks={mocks} appId="new" />);

    await waitFor(() => expect(screen.getByTestId("status")).toBeInTheDocument());

    expect(screen.getByTestId("status").textContent).toEqual(FormStatus.LOADED);
    expect(screen.getByTestId("app-id").textContent).toEqual("new");
    expect(screen.getByTestId("pi-first-name").textContent).toEqual("");
    expect(screen.getByTestId("pi-last-name").textContent).toEqual("");
  });

  // it("should execute saveApplication when setData is called", async () => {
  //   fail("Not implemented");
  // });

  // it("should create and return the appId for new submissions", async () => {
  //   fail("Not implemented");
  // });
});
