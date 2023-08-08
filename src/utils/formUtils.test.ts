import * as utils from "./formUtils";
import programs, { BlankProgram, BlankStudy, OptionalProgram, OptionalStudy } from '../config/ProgramConfig';

describe("filterNonNumeric cases", () => {
  it("should filter non-numerics", () => {
    expect(utils.filterNonNumeric("123abc")).toEqual("123");
  });

  it("should preserve original strings", () => {
    expect(utils.filterNonNumeric("")).toEqual("");
  });

  it("should return empty strings if there is no numerics", () => {
    expect(utils.filterNonNumeric("abc")).toEqual("");
  });
});

describe("filterForNumbers cases", () => {
  it('should return empty string when given an empty string', () => {
    expect(utils.filterForNumbers('')).toBe('');
  });

  it('should return only numbers when given a string with numbers and other characters', () => {
    expect(utils.filterForNumbers('abc123def456')).toBe('123456');
  });

  it('should return only numbers and dashes when given a string with numbers, dashes, and other characters', () => {
    expect(utils.filterForNumbers('abc123-def456')).toBe('123-456');
  });

  it('should return only numbers when given a string with numbers and spaces', () => {
    expect(utils.filterForNumbers('123 456')).toBe('123456');
  });

  it('should return only numbers and dashes when given a string with numbers, dashes, and spaces', () => {
    expect(utils.filterForNumbers('123 - 456')).toBe('123-456');
  });
});

describe("validateEmail cases", () => {
  it("should prevent domain-only emails", () => {
    expect(utils.validateEmail("abc.com")).toEqual(false);
  });

  it("should prevent domains without TLDs emails", () => {
    expect(utils.validateEmail("test-email@example")).toEqual(false);
  });

  it('should return false for invalid email', () => {
    expect(utils.validateEmail('testexample.com')).toBe(false);
  });

  it('should return false for email with spaces', () => {
    expect(utils.validateEmail('test example@example.com')).toBe(false);
  });

  it('should return false for email with special characters', () => {
    expect(utils.validateEmail('test!example@example.com')).toBe(false);
  });

  it('should return false for email with multiple @ symbols', () => {
    expect(utils.validateEmail('test@example@com')).toBe(false);
  });

  it("should allow periods", () => {
    expect(utils.validateEmail("abc.123@example.com")).toEqual(true);
  });

  it('should return true for valid email', () => {
    expect(utils.validateEmail('test@example.com')).toBe(true);
  });

  it("should allow valid NIH emails", () => {
    expect(utils.validateEmail("abc@nih.gov")).toEqual(true);
  });

  it("should allow dashes", () => {
    expect(utils.validateEmail("test-email@example.com")).toEqual(true);
  });
});

describe("mapObjectWithKey cases", () => {
  const object = [
    { name: "test1" },
    { name: "test2" },
    { name: "test3" }
  ];

  it("should not modify the original object", () => {
    expect(object.map(utils.mapObjectWithKey)).not.toBe(object);
  });

  it("should add a key to each object", () => {
    const newObject = object.map(utils.mapObjectWithKey);

    newObject.forEach((obj) => {
      expect(obj).toHaveProperty("key");
      expect(obj.key).not.toEqual("");
    });
  });
});

describe("findProgram cases", () => {
  it("should default to the optional program", () => {
    const program = utils.findProgram("test ABC 123 this should never exist", "test abbrev this should never exist either");

    expect(program.name).toEqual(OptionalProgram.name);
    expect(program.abbreviation).toEqual(OptionalProgram.abbreviation);
    expect(program.studies).toEqual([...OptionalProgram.studies, BlankStudy, OptionalStudy]);
  });

  it("should default to the blank program if no valid name or abbreviation", () => {
    const program = utils.findProgram("", "");

    expect(program.name).toEqual(BlankProgram.name);
    expect(program.abbreviation).toEqual(BlankProgram.abbreviation);
    expect(program.studies).toEqual([...BlankProgram.studies, BlankStudy, OptionalStudy]);
  });

  it("should return the correct program", () => {
    const program = utils.findProgram(programs[0].name, programs[0].abbreviation);

    expect(program.name).toEqual(programs[0].name);
    expect(program.abbreviation).toEqual(programs[0].abbreviation);
  });

  it("should put the optional study at the end of the list", () => {
    const program = utils.findProgram(programs[0].name, programs[0].abbreviation);

    expect(program.studies[program.studies.length - 1]).toEqual(OptionalStudy);
    expect(program.studies.length).toEqual(programs[0].studies.length + 2);
  });
  it("should contain a blank study option in the list", () => {
    const program = utils.findProgram(programs[0].name, programs[0].abbreviation);

    expect(program.studies).toContain(BlankStudy);
  });
});

describe("findStudy cases", () => {
  const program = programs[0];

  it("should default to the optional study", () => {
    const study = utils.findStudy("123 this 456 study shouldnt exist", "789 that abbrev study shouldnt exist", program);

    expect(study.name).toEqual(OptionalStudy.name);
    expect(study.abbreviation).toEqual(OptionalStudy.abbreviation);
  });

  it("should default to blank study if no valid name or abbreviation", () => {
    const study = utils.findStudy("", "", program);

    expect(study.name).toEqual(BlankStudy.name);
    expect(study.abbreviation).toEqual(BlankStudy.abbreviation);
    expect(study.isCustom).toEqual(BlankStudy.isCustom);
  });

  it("should return the correct study", () => {
    const study = utils.findStudy(program.studies[0].name, program.studies[0].abbreviation, program);

    expect(study.name).toEqual(program.studies[0].name);
    expect(study.abbreviation).toEqual(program.studies[0].abbreviation);
  });
});
