import React, { CSSProperties, memo, useCallback, useMemo } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  Typography,
  Grid,
  styled,
} from "@mui/material";
import { FormatDate, SortHistory } from "../../utils";
import TruncatedText from "../TruncatedText";

const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    borderRadius: "8px",
    boxShadow: "0px 4px 45px 0px rgba(0, 0, 0, 0.40)",
    padding: "28px 24px",
    width: "567px !important",
    border: "2px solid #388DEE",
    background: "#2E4D7B",
  },
});

const StyledDialogTitle = styled(DialogTitle)({
  paddingBottom: "0",
});

const StyledPreTitle = styled("p")({
  color: "#D5DAE7",
  fontSize: "13px",
  lineHeight: "27px",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  margin: "0",
});

const StyledTitle = styled("p")({
  color: "#FFF",
  fontSize: "35px",
  fontFamily: "Nunito Sans",
  fontWeight: "900",
  lineHeight: "30px",
  margin: "0",
});

const StyledDialogContent = styled(DialogContent)({
  marginTop: "20px",
  marginBottom: "22px",
  overflowY: "visible",
});

const StyledIcon = styled("div")({
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  lineHeight: "0",
  "& img": {
    WebkitUserDrag: "none",
  },
});

const StyledCloseButton = styled(Button)({
  minWidth: "137px",
  fontSize: "16px",
  fontWeight: "700",
  borderRadius: "8px",
  textTransform: "none",
  color: "#fff",
  borderColor: "#fff",
  margin: "0 auto",
  "&:hover": {
    borderColor: "#fff",
  },
});

const StyledGridHeader = styled(Grid)({
  borderBottom: "0.5px solid #375F9A",
  paddingBottom: "8px",
  marginBottom: "4px",
});

const StyledHistoryHeader = styled(Typography)<React.CSSProperties>((styles) => ({
  fontFamily: "Public Sans",
  fontWeight: "300",
  fontSize: "8px",
  textAlign: "center",
  textTransform: "uppercase",
  color: "#9FB3D1",
  userSelect: "none",
  ...styles,
}));

const StyledGridEventItem = styled(Grid)({
  padding: "17px 0",
  borderBottom: "0.5px solid #375F9A",
  alignItems: "center",
});

const BaseItemTypographyStyles: React.CSSProperties = {
  fontFamily: "Public Sans",
  fontWeight: "400",
  fontSize: "13px",
  letterSpacing: "0.0025em",
  userSelect: "none",
};

const StyledHistoryItem = styled(Typography)<React.CSSProperties>(
  ({ textAlign = "center", color = "inherit" }) => ({
    ...BaseItemTypographyStyles,
    textAlign,
    color,
  })
);

const DotContainer = styled("div")({
  position: "relative",
  width: "100%",
  height: "100%",
});

const VerticalDot = styled("div")({
  position: "absolute",
  top: "50%",
  left: "0px",
  transform: "translateY(-50%)",
  content: '""',
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  background: "white",
});

const TopConnector = styled("div")({
  content: '""',
  position: "absolute",
  left: "5px",
  bottom: "0",
  width: "6px",
  height: "27px",
  background: "white",
});

const BottomConnector = styled("div")({
  content: '""',
  position: "absolute",
  left: "5px",
  top: "0",
  width: "6px",
  height: "27px",
  background: "white",
});

const HorizontalLine = styled("div")({
  // Primary horizontal line
  position: "absolute",
  top: "50%",
  left: "0px",
  transform: "translateY(-50%)",
  content: '""',
  width: "68px",
  height: "1px",
  background: "white",
  // End dot adornment
  "&::after": {
    content: '""',
    position: "absolute",
    top: "50%",
    right: "0px",
    transform: "translateY(-50%)",
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    background: "white",
  },
});

type EventItem = {
  color: string;
  icon: string | null;
  status: string;
  date: string;
  nameColor: string;
  name: string | null;
};

export type IconType<T extends string> = Record<T, string>;

type Props<T extends string> = {
  preTitle: string;
  title: string;
  history: HistoryBase<T>[];
  iconMap: IconType<T>;
  getTextColor: (status: T) => CSSProperties["color"];
  onClose: () => void;
} & DialogProps;

/**
 * A generic history dialog component that displays a list of history transitions.
 *
 * @returns {JSX.Element} The history dialog component
 */
const HistoryDialog = <T extends string>({
  preTitle,
  title,
  history,
  iconMap,
  getTextColor,
  open,
  onClose,
  ...rest
}: Props<T>): JSX.Element => {
  const getColor = useCallback(
    (status: T) => {
      if (typeof getTextColor === "function") {
        return getTextColor(status);
      }

      return "#FFF";
    },
    [getTextColor]
  );

  const events = useMemo<EventItem[]>(() => {
    const result: EventItem[] = [];
    const sorted = SortHistory(history);

    sorted.forEach((item, index) => {
      const { status, dateTime, ...others } = item;

      result.push({
        color: getColor(status),
        icon: index === 0 && iconMap[status] ? iconMap[status] : null,
        status: status || "",
        date: dateTime,
        name: "userName" in others ? others.userName : null,
        nameColor: index === 0 ? getColor(status) : "#97B5CE",
      });
    });

    return result;
  }, [history, iconMap, getColor]);

  const eventHasNames: boolean = useMemo<boolean>(
    () => events.some((event) => event.name !== null),
    [events]
  );

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      scroll="body"
      data-testid="history-dialog"
      {...rest}
    >
      <StyledDialogTitle>
        <StyledPreTitle>{preTitle}</StyledPreTitle>
        <StyledTitle>{title}</StyledTitle>
      </StyledDialogTitle>
      <StyledDialogContent>
        <StyledGridHeader container columnSpacing={3}>
          <Grid item xs={2} />
          <Grid item xs={3}>
            <StyledHistoryHeader textAlign="left" paddingLeft="12px">
              Status
            </StyledHistoryHeader>
          </Grid>
          <Grid item xs={3}>
            <StyledHistoryHeader>Date</StyledHistoryHeader>
          </Grid>
          {eventHasNames && (
            <Grid item xs={3}>
              <StyledHistoryHeader>User</StyledHistoryHeader>
            </Grid>
          )}
          <Grid item xs={1} />
        </StyledGridHeader>
        {events?.map(({ status, date, color, name, nameColor, icon }, index) => (
          <StyledGridEventItem
            container
            key={`history-event-${date}`}
            data-testid={`history-item-${index}`}
            columnSpacing={3}
          >
            <Grid item xs={2}>
              <DotContainer>
                {index !== 0 && <TopConnector />}
                <VerticalDot />
                <HorizontalLine />
                {index !== events.length - 1 && <BottomConnector />}
              </DotContainer>
            </Grid>
            <Grid item xs={3}>
              <StyledHistoryItem
                color={color}
                textAlign="left"
                data-testid={`history-item-${index}-status`}
              >
                {status?.toUpperCase()}
              </StyledHistoryItem>
            </Grid>
            <Grid item xs={3}>
              <StyledHistoryItem
                color={color}
                title={date}
                data-testid={`history-item-${index}-date`}
              >
                {FormatDate(date, "M/D/YYYY", "N/A")}
              </StyledHistoryItem>
            </Grid>
            {eventHasNames && (
              <Grid item xs={3} data-testid={`history-item-${index}-name`}>
                <StyledHistoryItem>
                  <TruncatedText
                    text={name}
                    maxCharacters={14}
                    wrapperStyles={{
                      ...BaseItemTypographyStyles,
                      margin: "0 auto",
                      color: nameColor,
                    }}
                  />
                </StyledHistoryItem>
              </Grid>
            )}
            <Grid item xs={1} sx={{ position: "relative" }}>
              {icon && (
                <StyledIcon>
                  <img
                    src={icon}
                    alt={`${status} icon`}
                    data-testid={`history-item-${index}-icon`}
                  />
                </StyledIcon>
              )}
            </Grid>
          </StyledGridEventItem>
        ))}
      </StyledDialogContent>
      <DialogActions>
        <StyledCloseButton
          onClick={onClose}
          variant="outlined"
          size="large"
          color="info"
          data-testid="history-dialog-close"
        >
          Close
        </StyledCloseButton>
      </DialogActions>
    </StyledDialog>
  );
};

export default memo(HistoryDialog) as typeof HistoryDialog;
