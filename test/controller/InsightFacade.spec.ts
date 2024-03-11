import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {AssertionError, assert, expect, use} from "chai";
import chaiAsPromised = require("chai-as-promised");
import {clearDisk, getContentFromArchives, readFileQueries, ITestQuery, ITestSuite} from "../TestUtil";
import {readdir} from "fs/promises";
use(chaiAsPromised);

describe("InsightFacade_NewSuite", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let rooms: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		// rooms = await getContentFromArchives("rooms.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject with  an empty dataset id", async function () {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});


	describe("performQueryNoDataset", function () {
		before("clear the disk", function () {
			return clearDisk();
		});
		it("should reject if a query references a dataset not added", async function () {
			const ASSERT_1 = expect(
				new InsightFacade().performQuery({
					WHERE: {},
					OPTIONS: {
						COLUMNS: ["sections_dept"],
					},
				})
			).to.be.rejectedWith(InsightError);
			return await ASSERT_1;
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You can and should still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", function () {
		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				// facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms)
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		describe("valid queries", function () {
			let validQueries: ITestSuite[];
			try {
				validQueries = readFileQueries("valid.json");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function (tests) {
				context(`${tests.title}`, function () {
					tests.tests.forEach(function (test: ITestQuery) {
						it(`${test.title}`, async function () {
							if (test.errorExpected) {
								return assert.fail("Query should not be expected to throw an error");
							}
							const result = facade.performQuery(test.input);
							// console.log(JSON.stringify(await result));
							return expect(result)
								.to.eventually.deep.equal(test.expected);
						});
					});
				});
			});
		});

		describe("invalid queries", function () {
			let invalidQueries: ITestSuite[];

			try {
				invalidQueries = readFileQueries("invalid.json");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			invalidQueries.forEach(function (tests) {
				context(`${tests.title}`, function () {
					tests.tests.forEach(function (test: ITestQuery) {
						it(`${test.title}`, async function () {
							if (!test.errorExpected) {
								return assert.fail("Query should be expected to throw an error");
							}
							try {
								await facade.performQuery(test.input);
								assert.fail(`should have been rejected with ${test.expected as string}`);
							} catch (err) {
								if (err instanceof AssertionError) {
									throw err;
								}
								console.log(`⬇️ threw error message: ${(err as Error).message}`);
								switch (test.expected) {
									case "InsightError":
										console.log(JSON.stringify(err));
										expect(err).to.be.instanceOf(InsightError);
										break;
									case "ResultTooLargeError":
										expect(err).to.be.instanceOf(ResultTooLargeError);
										break;
									default:
										assert.fail("Query threw unexpected error");
								}
							}
						});
					});
				});
			});
		});
	});
});

describe.skip("InsightFacade", function () {
	const validId = "validId";
	const validKind = InsightDatasetKind.Sections;
	let validContent: string;

	describe("loading from disk", function () {
		it("should load from disk after creating new instance", async function () {
			const facade = new InsightFacade();
			await facade.addDataset(validId, validContent, validKind);
			const newFacade = new InsightFacade();
			const datasets = await newFacade.listDatasets();
			return expect(datasets).to.have.lengthOf(1);
			// return expect(await facade.removeDataset(validId));
		});
	});
	before("read in content", async function () {
		validContent = await getContentFromArchives("pair.zip");
	});

	const loadValidDataset = async () => {
		await clearDisk();
		await new InsightFacade().addDataset(validId, validContent, validKind);
	};

	describe("addDataset", function () {
		beforeEach("clean disk before runs", () => {
			return clearDisk();
		});

		it("should not fail with valid values, writing dataset to disk post-insertion", async function () {
			expect(await new InsightFacade().addDataset(validId, validContent, validKind)).to.be.deep.equal([validId]);
			const files = await readdir("./data");
			return expect(files.length).to.be.greaterThan(0);
		});

		context("checking dataset ID (arg1)", function () {
			it("should fail when an invalid dataset ID is passed", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().addDataset("invalid_id", validContent, validKind)
				).to.be.rejectedWith(InsightError);
				const ASSERT_2 = expect(
					new InsightFacade().addDataset("   ", validContent, validKind)
				).to.be.rejectedWith(InsightError);
				const ASSERT_3 = expect(new InsightFacade().addDataset("", validContent, validKind)).to.be.rejectedWith(
					InsightError
				);
				return await Promise.all([ASSERT_1, ASSERT_2, ASSERT_3]);
			});

			// it("should fail when a dataset with the same ID has already been added", async function () {
			// 	await new InsightFacade().addDataset(validId, validContent, validKind);
			// 	const ASSERT_1 = expect(new InsightFacade().addDataset(validId, validContent, validKind))
			// 		.to.be.rejectedWith(InsightError);
			// 	return await ASSERT_1;
			// });
			it("should fail when a dataset with the same ID has already been added", async function () {
				const insightFacade = new InsightFacade();
				await insightFacade.addDataset(validId, validContent, validKind);
				const ASSERT_1 = expect(insightFacade.addDataset(validId, validContent, validKind)).to.be.rejectedWith(
					InsightError
				);
				return await ASSERT_1;
			});
		});

		context("checking content zip file (arg2)", function () {
			it("should reject if content is not a base64 string of a zip file", async function () {
				return await Promise.all([
					// invalid characters
					expect(new InsightFacade().addDataset(validId, "-", validKind)).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().addDataset(validId, ".", validKind)).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().addDataset(validId, "#", validKind)).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().addDataset(validId, "$", validKind)).to.be.rejectedWith(InsightError),

					// valid characters but doesn't make sense as a zip file
					expect(new InsightFacade().addDataset(validId, "abcdef", validKind)).to.be.rejectedWith(
						InsightError
					),
				]);
			});

			it("should reject if content has an empty courses folder", async function () {
				const emptyCourseContent = await getContentFromArchives("pair_empty_courses.zip");
				const ASSERT_1 = expect(
					new InsightFacade().addDataset(validId, emptyCourseContent, validKind)
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});

			it("should reject if a file is not a JSON formatted file", async function () {
				const YMLContent = await getContentFromArchives("pair_literally_yml.zip");
				const assertYML = expect(
					new InsightFacade().addDataset(validId, YMLContent, validKind)
				).to.be.rejectedWith(InsightError);

				const badJSONContent = await getContentFromArchives("pair_slight_invalid_json.zip");
				const assertBadJSON = expect(
					new InsightFacade().addDataset(validId, badJSONContent, validKind)
				).to.be.rejectedWith(InsightError);

				await Promise.all([assertYML, assertBadJSON]);
			});

			it("should be located within a folder called courses/ in the zip's root directory", async function () {
				const NotInCourses = await getContentFromArchives("pair_not_in_courses.zip");
				const ASSERT_1 = expect(
					new InsightFacade().addDataset(validId, NotInCourses, validKind)
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});
		});

		context("checking content JSON fields (arg2)", function () {
			it("should reject if the results field dne/is not an array", async function () {
				const ASSERT_1 = getContentFromArchives("pair_result_is_object.zip").then((object_result) =>
					expect(new InsightFacade().addDataset(validId, object_result, validKind)).to.be.rejectedWith(
						InsightError
					)
				);
				const ASSERT_2 = getContentFromArchives("pair_result_is_string.zip").then((string_result) =>
					expect(new InsightFacade().addDataset(validId, string_result, validKind)).to.be.rejectedWith(
						InsightError
					)
				);
				const ASSERT_3 = getContentFromArchives("pair_empty_results.zip").then((dne_result) =>
					expect(new InsightFacade().addDataset(validId, dne_result, validKind)).to.be.rejectedWith(
						InsightError
					)
				);

				return Promise.all([ASSERT_1, ASSERT_2, ASSERT_3]);
			});

			it("should reject if 'results' lacks valid sections (missing fields).", async function () {
				const ASSERT_1 = getContentFromArchives("pair_bad_section.zip").then((bad_section_content) =>
					expect(new InsightFacade().addDataset(validId, bad_section_content, validKind)).to.be.rejectedWith(
						InsightError
					)
				);

				const ASSERT_2 = getContentFromArchives("pair_some_valid_fields.zip").then((some_valid_fields) =>
					expect(new InsightFacade().addDataset(validId, some_valid_fields, validKind)).to.be.rejectedWith(
						InsightError
					)
				);
				return await Promise.all([ASSERT_1, ASSERT_2]);
			});
		});

		it("should reject with invalid kind value (arg3)", async function () {
			const ASSERT_1 = expect(
				new InsightFacade().addDataset(validId, validContent, "invalid_kind" as InsightDatasetKind)
			).to.be.rejectedWith(InsightError);
			return await ASSERT_1;
		});
	});

	describe("removeDataset", function () {
		beforeEach("add dataset to InsightFacade", async function () {
			return loadValidDataset();
		});

		it("should fail if the section does not exist", async function () {
			const ASSERT_1 = expect(new InsightFacade().removeDataset("notExistId")).to.be.rejectedWith(NotFoundError);
			return await ASSERT_1;
		});

		it("should fail if the id passed in is not valid", async function () {
			const ASSERT_1 = expect(new InsightFacade().removeDataset("invalid_id")).to.be.rejectedWith(InsightError);
			const ASSERT_2 = expect(new InsightFacade().removeDataset("   ")).to.be.rejectedWith(InsightError);
			return await Promise.all([ASSERT_1, ASSERT_2]);
		});

		it("should successfully remove the dataset and return the id", async function () {
			const ASSERT_1 = expect(new InsightFacade().removeDataset(validId)).to.eventually.equal(validId);
			await ASSERT_1;
			const ASSERT_2 = expect(new InsightFacade().listDatasets()).to.eventually.deep.equal([]);
			return await ASSERT_2;
		});
	});

	describe("listDatasets", function () {
		it("should list all datasets when there are datasets", async function () {
			// setup
			await loadValidDataset();
			// test
			const ASSERT_1 = expect(new InsightFacade().listDatasets()).to.eventually.be.deep.equal([
				{
					id: validId,
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
			]);
			return await ASSERT_1;
		});
		it("should list all datasets when there are datasets", async function () {
			// setup
			await loadValidDataset();

			// test
			const datasets = await new InsightFacade().listDatasets();
			expect(datasets).to.have.lengthOf(1);
			const dataset = datasets[0];
			expect(dataset.id).to.equal(validId);
			expect(dataset.kind).to.equal(InsightDatasetKind.Sections);
			expect(dataset.numRows).to.equal(64612);
		});

		it("should return an empty array when there are no datasets", async function () {
			// setup
			await clearDisk();
			// test
			const ASSERT_1 = expect(new InsightFacade().listDatasets()).to.eventually.be.deep.equal([]);
			return await ASSERT_1;
		});
	});
});

// describe("InsightFacade Whitebox", function () {
// 	describe("handleOptions", function () {
// 		it("should throw a InsightError when OPTIONS is not an object", () => {
// 			expect(() => InsightFacade.options_filterColumns("not an object", "courses", [])).to.throw(InsightError);
// 		});
// 		it("should throw a InsightError when OPTIONS object has more than two keys", () => {
// 			const options = {key1: "value1", key2: "value2", key3: "value3"};
// 			expect(() => InsightFacade.options_filterColumns(options, "courses", [])).to.throw(InsightError);
// 		});

// 		it("should throw a InsightError when OPTIONS Query is invalid", () => {
// 			const options = {ORDER: "orderValue", invalidKey: "invalidValue"};
// 			expect(() => InsightFacade.options_filterColumns(options, "courses", [])).to.throw(InsightError);
// 		});

// 		it("should throw a InsightError when OPTIONS.ORDER is not a string", () => {
// 			const options: any = {COLUMNS: [], ORDER: 42};
// 			expect(() => InsightFacade.options_filterColumns(options, "courses", [])).to.throw(InsightError);
// 		});

// 		it("should throw a InsightError when OPTIONS.COLUMNS is not an array of strings", () => {
// 			const options = {COLUMNS: [1, 2, 3], ORDER: "orderValue"};
// 			expect(() => InsightFacade.options_filterColumns(options, "courses", [])).to.throw(InsightError);
// 		});

// 		it("should throw a InsightError when OPTIONS.COLUMNS contains a non-string value", () => {
// 			const options = {COLUMNS: ["string", 42], ORDER: "orderValue"};
// 			expect(() => InsightFacade.options_filterColumns(options, "courses", [])).to.throw(InsightError);
// 		});

// 		// THIS TEST IS WRONG because the columns do not refer to a valid existing dataset

// 		// it("should return filteredSections when OPTIONS are valid", () => {
// 		// 	const options = {COLUMNS: ["column1", "column2"], ORDER: "orderValue"};
// 		// 	const filteredSections: CourseSection[] = [{} as CourseSection];

// 		// 	expect(facade.handleOptions(options, "courses", filteredSections)).to.equal(filteredSections);
// 		// });
// 	});
// });
