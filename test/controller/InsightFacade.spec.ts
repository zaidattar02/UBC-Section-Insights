import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {assert, expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives, readFileQueries} from "../TestUtil";
import { readdir } from "fs/promises"

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
			const loadDatasetPromises = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch(err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		describe("valid queries", function() {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("valid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function(test: any) {
				it(`${test.title}`, function () {
					return facade.performQuery(test.input).then((result) => {
						assert.fail("Write your assertions here!");
					}).catch((err: any) => {
						assert.fail(`performQuery threw unexpected error: ${err}`);
					});
				});
			});
		});

		describe("invalid queries", function() {
			let invalidQueries: ITestQuery[];

			try {
				invalidQueries = readFileQueries("invalid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			invalidQueries.forEach(function(test: any) {
				it(`${test.title}`, function () {
					return facade.performQuery(test.input).then((result) => {
						assert.fail(`performQuery resolved when it should have rejected with ${test.expected}`);
					}).catch((err: any) => {
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

describe('InsightFacade', function () {
	const valid_id = "validId"
	const alt_valid_id = "validId2"
	const valid_kind = InsightDatasetKind.Sections
	const valid_m_keys = ["year", "avg", "pass", "fail", "audit"]
	const valid_s_keys = ["uuid", "id", "title", "instructor", "dept"]
	const valid_ids = [...valid_m_keys, ...valid_s_keys]
	let valid_content: string
	before('read in content', async function () { valid_content = await getContentFromArchives("pair.zip") })

	const load_valid_dataset = async () => {
		await clearDisk()
		await new InsightFacade().addDataset(valid_id, valid_content, valid_kind)
	}

	describe('addDataset', function () {
		beforeEach('clean disk before runs', () => {
			return clearDisk()
		})

		it("should not fail with all valid values, and should write dataset to disk immediately after being inserted", async function () {
			expect(await new InsightFacade().addDataset(valid_id, valid_content, valid_kind)).to.be.deep.equal([valid_id])
			const files = await readdir("./data")
			return expect(files.length).to.be.greaterThan(0)
		})

		context("checking dataset ID (arg1)", function () {
			it("should fail when an invalid dataset ID is passed", async function () {
				const assert_1 = expect(new InsightFacade().addDataset("invalid_id", valid_content, valid_kind)).to.be.rejectedWith(InsightError)
				const assert_2 = expect(new InsightFacade().addDataset("   ", valid_content, valid_kind)).to.be.rejectedWith(InsightError)
				const assert_3 = expect(new InsightFacade().addDataset("", valid_content, valid_kind)).to.be.rejectedWith(InsightError)
				return await Promise.all([assert_1, assert_2, assert_3])
			})

			it("should fail when a dataset with the same ID has already been added", async function () {
				await new InsightFacade().addDataset(valid_id, valid_content, valid_kind)
				const assert_1 = expect(new InsightFacade().addDataset(valid_id, valid_content, valid_kind)).to.be.rejectedWith(InsightError)
				return await assert_1
			})
		})

		context("checking content zip file (arg2)", function () {
			it("should reject if content is not a base64 string of a zip file", async function () {
				return await Promise.all([
					// invalid characters
					expect(new InsightFacade().addDataset(valid_id, "-", valid_kind)).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().addDataset(valid_id, ".", valid_kind)).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().addDataset(valid_id, "#", valid_kind)).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().addDataset(valid_id, "$", valid_kind)).to.be.rejectedWith(InsightError),

					// valid characters but doesn't make sense as a zip file
					expect(new InsightFacade().addDataset(valid_id, "abcdef", valid_kind)).to.be.rejectedWith(InsightError)
				])
			})

			it("should reject if content has an empty courses folder", async function () {
				const empty_course_content = await getContentFromArchives("pair_empty_courses.zip")
				const assert_1 = expect(new InsightFacade().addDataset(valid_id, empty_course_content, valid_kind)).to.be.rejectedWith(InsightError)

				return await assert_1
			})

			it("should reject if a file is not a JSON formatted file", async function () {
				const yml_content = await getContentFromArchives("pair_literally_yml.zip")
				const assert_yml = expect(new InsightFacade().addDataset(valid_id, yml_content, valid_kind)).to.be.rejectedWith(InsightError)

				const bad_json_content = await getContentFromArchives("pair_slight_invalid_json.zip")
				const assert_bad_json = expect(new InsightFacade().addDataset(valid_id, bad_json_content, valid_kind)).to.be.rejectedWith(InsightError)

				await Promise.all([assert_yml, assert_bad_json])
			})

			it("should be located within a folder called courses/ in the zip's root directory", async function () {
				const not_in_courses = await getContentFromArchives("pair_not_in_courses.zip")
				const assert_1 = expect(new InsightFacade().addDataset(valid_id, not_in_courses, valid_kind)).to.be.rejectedWith(InsightError)

				return await assert_1
			})
		})

		context("checking content JSON fields (arg2)", function () {
			it("should reject if the results field dne/is not an array", async function () {
				const assert_1 = getContentFromArchives("pair_result_is_object.zip").then(object_result =>
					expect(new InsightFacade().addDataset(valid_id, object_result, valid_kind)).to.be.rejectedWith(InsightError))
				const assert_2 = getContentFromArchives("pair_result_is_string.zip").then(string_result =>
					expect(new InsightFacade().addDataset(valid_id, string_result, valid_kind)).to.be.rejectedWith(InsightError))
				const assert_3 = getContentFromArchives("pair_empty_results.zip").then(dne_result =>
					expect(new InsightFacade().addDataset(valid_id, dne_result, valid_kind)).to.be.rejectedWith(InsightError))

				return Promise.all([assert_1, assert_2, assert_3])
			})

			it("should reject if the results field contains 0 valid sections (does not contain every field)", async function () {
				const assert_1 = getContentFromArchives("pair_bad_section.zip").then(bad_section_content =>
					expect(new InsightFacade().addDataset(valid_id, bad_section_content, valid_kind)).to.be.rejectedWith(InsightError))

				const assert_2 = getContentFromArchives("pair_some_valid_fields.zip").then(some_valid_fields =>
					expect(new InsightFacade().addDataset(valid_id, some_valid_fields, valid_kind)).to.be.rejectedWith(InsightError))
				return await Promise.all([assert_1, assert_2])
			})
		})

		it("should reject with invalid kind value (arg3)", async function () {
			const assert_1 = expect(new InsightFacade().addDataset(valid_id, valid_content, "invalid_kind" as InsightDatasetKind))
				.to.be.rejectedWith(InsightError)
			return await assert_1
		})
	})

	describe('removeDataset', function () {
		beforeEach("add dataset to InsightFacade", async function () {
			return load_valid_dataset()
		})

		it("should fail if the section does not exist", async function () {
			const assert_1 = expect(new InsightFacade().removeDataset("notExistId")).to.be.rejectedWith(NotFoundError)
			return await assert_1
		})

		it("should fail if the id passed in is not valid", async function () {
			const assert_1 = expect(new InsightFacade().removeDataset("invalid_id")).to.be.rejectedWith(InsightError)
			const assert_2 = expect(new InsightFacade().removeDataset("   ")).to.be.rejectedWith(InsightError)
			return await Promise.all([assert_1, assert_2])
		})

		it("should successfully remove the dataset and return the id", async function () {
			const assert_1 = expect(new InsightFacade().removeDataset(valid_id)).to.eventually.equal(valid_id)
			await assert_1
			const assert_2 = expect(new InsightFacade().listDatasets()).to.eventually.deep.equal([])
			return await assert_2
		})
	})

	describe('listDatasets', function () {
		it("should list all datasets when there are datasets", async function () {
			//setup
			await load_valid_dataset()
			//test
			const assert_1 = expect(new InsightFacade().listDatasets()).to.eventually.be.deep.equal([{
				id: valid_id,
				kind: InsightDatasetKind.Sections,
				numRows: 64612,
			}])
			return await assert_1
		})

		it("should return an empty array when there are no datasets", async function () {
			//setup
			await clearDisk()
			//test
			const assert_1 = expect(new InsightFacade().listDatasets()).to.eventually.be.deep.equal([])
			return await assert_1
		})
	})

	describe('performQueryNoDataset', function () {
		before('clear the disk', function () {
			return clearDisk()
		})

		it("should reject if a query references a dataset not added", async function () {
			const assert_1 = expect(new InsightFacade().performQuery({
				"WHERE": {},
				"OPTIONS": {
					"COLUMNS": [`${valid_id}_dept`],
				}
			})).to.be.rejectedWith(InsightError)
			return await assert_1
		})
	})

	describe('performQuery', function () {
		before("add dataset to InsightFacade", async function () { // if performQuery mutates the dataset, I will kill myself during class
			await load_valid_dataset()
			return await new InsightFacade().addDataset(alt_valid_id, valid_content, valid_kind)
		})

		context("testing with semantically invalid query objects", function () {
			it("should reject if a query is not an object", async function () {
				return await Promise.all([
					expect(new InsightFacade().performQuery("invalid_query")).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().performQuery(1)).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().performQuery([])).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().performQuery(null)).to.be.rejectedWith(InsightError),
					expect(new InsightFacade().performQuery(undefined)).to.be.rejectedWith(InsightError)
				])
			})

			it("should reject if there is no where", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"OPTIONS": {
						"COLUMNS": [`${valid_id}_dept`]
					}
				})).to.be.rejectedWith(InsightError)

				return await assert_1
			})

			it("should reject if there is no options", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {}
				})).to.be.rejectedWith(InsightError)

				return await assert_1
			})

			it("should reject if there is no columns in options", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {},
					"OPTIONS": {}
				})).to.be.rejectedWith(InsightError)

				return await assert_1
			})

			it("should reject if column is empty array", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {},
					"OPTIONS": {
						"COLUMNS": []
					}
				})).to.be.rejectedWith(InsightError)

				return await assert_1
			})
		})

		const valid_query_keys = valid_ids.map((key) => `${valid_id}_${key}`)
		context("testing with logically invalid query objects", function () {
			it("should reject if a query has more than 5000 results", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {},
					"OPTIONS": {
						"COLUMNS": [valid_query_keys[0]],
					}
				})).to.be.rejectedWith(ResultTooLargeError)
				return await assert_1
			})

			it("should reject if a query references multiple datasets in OPTIONS-COLUMNS", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {},
					"OPTIONS": {
						"COLUMNS": [`${valid_id}_dept`, `${alt_valid_id}_dept`],
					}
				})).to.be.rejectedWith(InsightError)

				return await assert_1
			})


			it("should reject if a query references multiple datasets in WHERE CLAUSE", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {
						"IS": {
							[`${alt_valid_id}_dept`]: "zool"
						}
					},
					"OPTIONS": {
						"COLUMNS": [`${valid_id}_dept`],
					}
				})).to.be.rejectedWith(InsightError)

				return await assert_1
			})

			// this way the case where order and column both have the same invalid id should be covered
			// this test gives us invariant that column checks query ids also check order ids
			it("should reject if the ORDER value is not in COLUMNS", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {},
					"OPTIONS": {
						"COLUMNS": [valid_query_keys[0],],
						"ORDER": valid_query_keys[1],
					}
				})).to.be.rejectedWith(InsightError)

				return await assert_1
			})

			it("should reject if there is an invalid id in COLUMN", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {},
					"OPTIONS": {
						"COLUMNS": ["sussybaka",],
					}
				})).to.be.rejectedWith(InsightError)

				const assert_2 = expect(new InsightFacade().performQuery({
					"WHERE": {},
					"OPTIONS": {
						"COLUMNS": [valid_id,],
					}
				})).to.be.rejectedWith(InsightError)

				const assert_3 = expect(new InsightFacade().performQuery({
					"WHERE": {},
					"OPTIONS": {
						"COLUMNS": [`${valid_id}_sussybaka`,],
					}
				})).to.be.rejectedWith(InsightError)

				return await Promise.all([assert_1, assert_2, assert_3])
			})

			it("should reject if there is a mix of datasets in columns", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {},
					"OPTIONS": {
						"COLUMNS": [
							`${valid_id}_${valid_ids[0]}`,
							`${alt_valid_id}_${valid_ids[1]}`,
						],
					}
				})).to.be.rejectedWith(InsightError)

				return await assert_1
			})

			it("should reject if there's a wildcard in the middle of a string", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {
						"IS": {
							[`${valid_id}_dept`]: "c*sc"
						}
					},
					"OPTIONS": {
						"COLUMNS": [`${valid_id}_dept`],
					}
				})).to.be.rejectedWith(InsightError)

				return await assert_1
			})
		})

		context("testing with valid query objects", function () {
			it("should select all columns effectively", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {
						"EQ": {
							[`${valid_id}_avg`]: 95
						}
					},
					"OPTIONS": {
						"COLUMNS": valid_query_keys,
					}
				})).to.be.fulfilled
				return await assert_1
			})

			it("should wildcards should work", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {
						"AND": [
							{
								"EQ": {
									[`${valid_id}_avg`]: 75
								}
							},
							{
								"IS": {
									[`${valid_id}_dept`]: "c*"
								}
							},
							{
								"IS": {
									[`${valid_id}_instructor`]: "*n"
								}
							},
							{
								"IS": {
									[`${valid_id}_title`]: "*u*"
								}
							}
						]
					},
					"OPTIONS": {
						"COLUMNS": [valid_query_keys[0]],
					}
				})).to.be.eventually.of.length(5)
				return await assert_1
			})

			it("should have functioning EQ (and OR)", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {
						"OR": [
							{ "EQ": { [`${valid_id}_audit`]: 5 } },
							{ "EQ": { [`${valid_id}_fail`]: 20 } }
						]
					},
					"OPTIONS": {
						"COLUMNS": [
							valid_query_keys[0]
						]
					}
				})).to.be.eventually.of.length(214)
				return await assert_1
			})

			it("should have functioning GT, EQ (and AND)", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {
						"AND": [
							{
								"GT": {
									[`${valid_id}_avg`]: 98.57
								}
							},
							{
								"EQ": {
									[`${valid_id}_year`]: 1900
								}
							}
						]
					},
					"OPTIONS": {
						"COLUMNS": [
							`${valid_id}_dept`
						]
					}
				})).to.be.eventually.of.length(7)
				return await assert_1
			})

			it("should have functioning LT, IS (and AND)", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {
						"AND": [
							{ "LT": { [`${valid_id}_year`]: 1901 } },
							{ "IS": { [`${valid_id}_dept`]: "zool" } }
						]
					},
					"OPTIONS": { "COLUMNS": [`${valid_id}_dept`] }
				})).to.be.eventually.of.length(15)
				return await assert_1
			})

			it("should have functioning GT (and NOT)", async function () {
				const assert_1 = expect(new InsightFacade().performQuery({
					"WHERE": {
						"NOT": {
							"LT": {
								[`${valid_id}_avg`]: 98.57
							}
						}
					},
					"OPTIONS": {
						"COLUMNS": [
							`${valid_id}_dept`
						]
					}
				})).to.be.eventually.of.length(17)
				return await assert_1
			})
		})
	})
})