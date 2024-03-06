import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {assert, expect, use} from "chai";
import chaiAsPromised = require("chai-as-promised");
import {clearDisk, getContentFromArchives, readFileQueries} from "../TestUtil";
import {readdir} from "fs/promises";
import {CourseSection} from "../../src/model/CourseSection";

use(chaiAsPromised);

export interface ITestQuery {
	title: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");

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

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You can and should still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", function () {
		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [facade.addDataset("sections", sections, InsightDatasetKind.Sections)];

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
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("valid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function (test) {
				it(`${test.title}`, function () {
					if (test.errorExpected) {
						return expect(facade.performQuery(test.input)).to.be.rejectedWith(test.expected);
					} else {
						return expect(facade.performQuery(test.input)).to.eventually.deep.equal(test.expected);
					}
				});
			});
		});

		describe("invalid queries", function () {
			let invalidQueries: ITestQuery[];

			try {
				invalidQueries = readFileQueries("invalid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			invalidQueries.forEach(function (test: any) {
				it(`${test.title}`, function () {
					return facade
						.performQuery(test.input)
						.then((result) => {
							assert.fail(`performQuery resolved when it should have rejected with ${test.expected}`);
						})
						.catch((err: any) => {
							if (test.expected === "InsightError") {
								expect(err).to.be.instanceOf(InsightError);
							} else {
								assert.fail("Query threw unexpected error");
							}
						});
				});
			});
		});
	});
});

describe("InsightFacade", function () {
	const validId = "validId";
	const altValidID = "validId2";
	const validKind = InsightDatasetKind.Sections;
	const validMKeys = ["year", "avg", "pass", "fail", "audit"];
	const validSKeys = ["uuid", "id", "title", "instructor", "dept"];
	const validIDs = [...validMKeys, ...validSKeys];
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

	describe("performQueryNoDataset", function () {
		before("clear the disk", function () {
			return clearDisk();
		});

		it("should reject if a query references a dataset not added", async function () {
			const ASSERT_1 = expect(
				new InsightFacade().performQuery({
					WHERE: {},
					OPTIONS: {
						COLUMNS: [`${validId}_dept`],
					},
				})
			).to.be.rejectedWith(InsightError);
			return await ASSERT_1;
		});
	});

	describe("performQuery", function () {
		before("add dataset to InsightFacade", async function () {
			// if performQuery mutates the dataset, I will kill myself during class
			await loadValidDataset();
			return await new InsightFacade().addDataset(altValidID, validContent, validKind);
		});

		context("testing with semantically invalid query objects", function () {
			it("should reject if a query is not an object", async function () {
				return await Promise.all([
					expect(new InsightFacade().performQuery("invalid_query")).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().performQuery(1)).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().performQuery([])).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().performQuery(null)).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().performQuery(undefined)).to.be.rejectedWith(InsightError),
				]);
			});

			it("should reject if there is no where", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						OPTIONS: {
							COLUMNS: [`${validId}_dept`],
						},
					})
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});

			it("should reject if there is no options", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {},
					})
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});

			it("should reject if there is no columns in options", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {},
						OPTIONS: {},
					})
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});

			it("should reject if column is empty array", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [],
						},
					})
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});
		});

		const ValidQueryKeys = validIDs.map((key) => `${validId}_${key}`);
		context("testing with logically invalid query objects", function () {
			it("should reject if a query has more than 5000 results", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [ValidQueryKeys[0]],
						},
					})
				).to.be.rejectedWith(ResultTooLargeError);
				return await ASSERT_1;
			});

			it("should reject if a query references multiple datasets in OPTIONS-COLUMNS", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [`${validId}_dept`, `${altValidID}_dept`],
						},
					})
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});

			it("should reject if a query references multiple datasets in WHERE CLAUSE", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {
							IS: {
								[`${altValidID}_dept`]: "zool",
							},
						},
						OPTIONS: {
							COLUMNS: [`${validId}_dept`],
						},
					})
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});

			// this way the case where order and column both have the same invalid id should be covered
			// this test gives us invariant that column checks query ids also check order ids
			it("should reject if the ORDER value is not in COLUMNS", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [ValidQueryKeys[0]],
							ORDER: ValidQueryKeys[1],
						},
					})
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});

			it("should reject if there is an invalid id in COLUMN", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["sussybaka"],
						},
					})
				).to.be.rejectedWith(InsightError);

				const ASSERT_2 = expect(
					new InsightFacade().performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [validId],
						},
					})
				).to.be.rejectedWith(InsightError);

				const ASSERT_3 = expect(
					new InsightFacade().performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [`${validId}_sussybaka`],
						},
					})
				).to.be.rejectedWith(InsightError);

				return await Promise.all([ASSERT_1, ASSERT_2, ASSERT_3]);
			});

			it("should reject if there is a mix of datasets in columns", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [`${validId}_${validIDs[0]}`, `${altValidID}_${validIDs[1]}`],
						},
					})
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});

			it("should reject if there's a wildcard in the middle of a string", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {
							IS: {
								[`${validId}_dept`]: "c*sc",
							},
						},
						OPTIONS: {
							COLUMNS: [`${validId}_dept`],
						},
					})
				).to.be.rejectedWith(InsightError);

				return await ASSERT_1;
			});
		});

		context("testing with valid query objects", function () {
			it("should select all columns effectively", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {
							EQ: {
								[`${validId}_avg`]: 95,
							},
						},
						OPTIONS: {
							COLUMNS: ValidQueryKeys,
						},
					})
				).to.be.fulfilled;
				return await ASSERT_1;
			});

			it("should wildcards should work", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {
							AND: [
								{
									EQ: {
										[`${validId}_avg`]: 75,
									},
								},
								{
									IS: {
										[`${validId}_dept`]: "c*",
									},
								},
								{
									IS: {
										[`${validId}_instructor`]: "*n",
									},
								},
								{
									IS: {
										[`${validId}_title`]: "*u*",
									},
								},
							],
						},
						OPTIONS: {
							COLUMNS: [ValidQueryKeys[0]],
						},
					})
				).to.be.eventually.of.length(5);
				return await ASSERT_1;
			});

			it("should have functioning EQ (and OR)", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {
							OR: [{EQ: {[`${validId}_audit`]: 5}}, {EQ: {[`${validId}_fail`]: 20}}],
						},
						OPTIONS: {
							COLUMNS: [ValidQueryKeys[0]],
						},
					})
				).to.be.eventually.of.length(214);
				return await ASSERT_1;
			});

			it("should have functioning GT, EQ (and AND)", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {
							AND: [
								{
									GT: {
										[`${validId}_avg`]: 98.57,
									},
								},
								{
									EQ: {
										[`${validId}_year`]: 1900,
									},
								},
							],
						},
						OPTIONS: {
							COLUMNS: [`${validId}_dept`],
						},
					})
				).to.be.eventually.of.length(7);
				return await ASSERT_1;
			});

			it("should have functioning LT, IS (and AND)", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {
							AND: [{LT: {[`${validId}_year`]: 1901}}, {IS: {[`${validId}_dept`]: "zool"}}],
						},
						OPTIONS: {COLUMNS: [`${validId}_dept`]},
					})
				).to.be.eventually.of.length(15);
				return await ASSERT_1;
			});

			it("should have functioning GT (and NOT)", async function () {
				const ASSERT_1 = expect(
					new InsightFacade().performQuery({
						WHERE: {
							NOT: {
								LT: {
									[`${validId}_avg`]: 98.57,
								},
							},
						},
						OPTIONS: {
							COLUMNS: [`${validId}_dept`],
						},
					})
				).to.be.eventually.of.length(17);
				return await ASSERT_1;
			});
		});
	});
});

describe("InsightFacade Whitebox", function () {
	describe("handleOptions", function () {
		let facade: InsightFacade;
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});
		it("should throw a InsightError when OPTIONS is not an object", () => {
			expect(() => facade.handleOptions("not an object", "courses", [])).to.throw(InsightError);
		});
		it("should throw a InsightError when OPTIONS object has more than two keys", () => {
			const options = {key1: "value1", key2: "value2", key3: "value3"};
			expect(() => facade.handleOptions(options, "courses", [])).to.throw(InsightError);
		});

		it("should throw a InsightError when OPTIONS Query is invalid", () => {
			const options = {ORDER: "orderValue", invalidKey: "invalidValue"};
			expect(() => facade.handleOptions(options, "courses", [])).to.throw(InsightError);
		});

		it("should throw a InsightError when OPTIONS.ORDER is not a string", () => {
			const options: any = {COLUMNS: [], ORDER: 42};
			expect(() => facade.handleOptions(options, "courses", [])).to.throw(InsightError);
		});

		it("should throw a InsightError when OPTIONS.COLUMNS is not an array of strings", () => {
			const options = {COLUMNS: [1, 2, 3], ORDER: "orderValue"};
			expect(() => facade.handleOptions(options, "courses", [])).to.throw(InsightError);
		});

		it("should throw a InsightError when OPTIONS.COLUMNS contains a non-string value", () => {
			const options = {COLUMNS: ["string", 42], ORDER: "orderValue"};
			expect(() => facade.handleOptions(options, "courses", [])).to.throw(InsightError);
		});

		// THIS TEST IS WRONG because the columns do not refer to a valid existing dataset

		// it("should return filteredSections when OPTIONS are valid", () => {
		// 	const options = {COLUMNS: ["column1", "column2"], ORDER: "orderValue"};
		// 	const filteredSections: CourseSection[] = [{} as CourseSection];

		// 	expect(facade.handleOptions(options, "courses", filteredSections)).to.equal(filteredSections);
		// });
	});
});
