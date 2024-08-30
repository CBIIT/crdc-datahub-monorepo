import { useAuthContext } from "../components/Contexts/AuthContext";
import { OrgRequiredRoles } from "../config/AuthRoles";

type EditableFields = Extends<
  keyof User,
  "firstName" | "lastName" | "role" | "userStatus" | "organization" | "studies" | "dataCommons"
>;

/**
 * Represents a field on the "User Profile" or "Edit User" page
 */
export type ProfileFields = Record<EditableFields, FieldState>;

/**
 * Represents the state of a field on the "User Profile" or "Edit User" page
 *
 * - `HIDDEN` means the field is not visible to the user at all
 * - `DISABLED` means the field is visible but not editable
 * - `UNLOCKED` means the field is visible and editable
 * - `TEXT_ONLY` means the field is rendered as text only
 */
export type FieldState = "HIDDEN" | "DISABLED" | "UNLOCKED" | "TEXT_ONLY";

/**
 * Determines which profile fields are visible, editable, and disabled for the current user
 *
 * @param profileOf the user whose profile is being viewed
 * @param viewType the page where the user originated from
 * @returns a collection of profile fields
 */
const useProfileFields = (
  profileOf: Pick<User, "_id" | "role">,
  viewType: "users" | "profile"
): Readonly<Partial<ProfileFields>> => {
  const { user } = useAuthContext();
  const fields: ProfileFields = {
    firstName: "TEXT_ONLY",
    lastName: "TEXT_ONLY",
    role: "TEXT_ONLY",
    userStatus: "TEXT_ONLY",
    organization: "TEXT_ONLY",
    dataCommons: "HIDDEN",
    studies: "HIDDEN",
  };
  const isSelf: boolean = user?._id === profileOf?._id;

  // Editable for the current user viewing their own profile
  if (isSelf && viewType === "profile") {
    fields.firstName = "UNLOCKED";
    fields.lastName = "UNLOCKED";
  }

  // Editable for Admin viewing Manage Users
  if (user?.role === "Admin" && viewType === "users") {
    fields.role = "UNLOCKED";
    fields.userStatus = "UNLOCKED";

    // Disable for roles with a pre-assigned organization requirement
    fields.organization =
      !OrgRequiredRoles.includes(profileOf?.role) && profileOf?.role !== "User"
        ? "DISABLED"
        : "UNLOCKED";
  }

  // Editable for Admin viewing Federal Monitor otherwise hidden
  // even for a user viewing their own profile
  if (user?.role === "Admin" && viewType === "users" && profileOf?.role === "Federal Monitor") {
    fields.studies = "UNLOCKED";
  }

  // Only applies to Data Commons POC
  if (profileOf?.role === "Data Commons POC") {
    fields.dataCommons = user?.role === "Admin" ? "UNLOCKED" : "TEXT_ONLY";
  } else {
    fields.dataCommons = "HIDDEN";
  }

  return fields;
};

export default useProfileFields;
