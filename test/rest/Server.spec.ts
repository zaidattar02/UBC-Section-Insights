import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";
import e, {Application} from "express";
const fs = require("fs");

describe("Facade D3", function () {
	let facade: InsightFacade;
	let server: Server;
	let SERVER_URL: string;

	before(async function () {
		facade = new InsightFacade();
		server = new Server(4321);
	});

	after(async function () {
		await deleteDataset("test");
		await deleteDataset("test-add");

	});

	// beforeEach(async function () {});

	// afterEach(async function () {});

	it("200 - Add dataset test for rooms dataset", async function () {
		try {
			let response = await addDataset("test-add", InsightDatasetKind.Rooms);
			const responseBody = JSON.parse(response.text);
			console.log(responseBody);
			expect(response.status).to.be.equal(200);
			expect(responseBody.result.length).to.be.equal(1);
		} catch (err) {
			console.error(err);
			throw err;
		}
	});
	it("400 - Add duplicate dataset test for rooms dataset", async function () {
		try {
			let secondAddResponse = await addDataset("test-add", InsightDatasetKind.Rooms);
			expect(secondAddResponse.status).to.be.equal(400);
		} catch (err) {
			console.error(err);
			expect.fail();
		}
	});

	it("200 - Delete dataset test for rooms dataset", async function () {
		try {
			let addResponse = await addDataset("test", InsightDatasetKind.Rooms);
			expect(addResponse.status).to.be.equal(200);

			let deleteResponse = await deleteDataset("test");
			expect(deleteResponse.status).to.be.equal(200);
			const deleteResponseBody = JSON.parse(deleteResponse.text);
			expect(deleteResponseBody.result).to.be.equal("test");
		} catch (err) {
			console.error(err);
			expect.fail();
		}
	});
	it("404 - Delete invailid dataset dataset test for rooms dataset", async function () {
		try {
			let deleteResponse = await deleteDataset("test");
			expect(deleteResponse.status).to.be.equal(404);
		} catch (err) {
			console.error(err);
			expect.fail();
		}
	});
	it("400 - Invalid Query dataset test for rooms dataset", async function () {
		try {
			let deleteResponse = await queryDataset({
				WHERE: {},
				OPTIONS: {
					COLUMNS: [
						"test_address"
					]
				}
			});
			expect(deleteResponse.status).to.be.equal(400);
			const deleteResponseBody = JSON.parse(deleteResponse.text);
		} catch (err) {
			console.error(err);
			expect.fail();
		}
	});
	it("200 - Query dataset test for rooms dataset", async function () {
		try {
			let addResponse = await addDataset("test", InsightDatasetKind.Rooms);
			expect(addResponse.status).to.be.equal(200);

			let response = await queryDataset({
				WHERE: {},
				OPTIONS: {
					COLUMNS: [
						"test_address"
					]
				}
			});
			expect(response.status).to.be.equal(200);
			const responseBody = JSON.parse(response.text);
			expect(responseBody.result.length > 0).to.be.true;
		} catch (err) {
			console.error(err);
			expect.fail();
		}
	});
	it("200 - Get All dataset test for rooms dataset", async function () {
		try {
			let response = await getDatasets();
			expect(response.status).to.be.equal(200);
			const responseBody = JSON.parse(response.text);
			expect(responseBody.result.length > 0).to.be.true;
		} catch (err) {
			console.error(err);
			expect.fail();
		}
	});

	async function addDataset(id: string, kind: InsightDatasetKind) {
		const buffer = await fs.readFileSync("test/resources/archives/rooms/campus.zip");
		try {
			let response = await request(server.app)
				.put(`/dataset/${id}/${kind}`)
				.send(buffer)
				.set("Content-Type", "application/zip");
			return response;
		} catch (err) {
			console.error(err);
			throw err;
		}
	}
	async function queryDataset(query: object) {
		try {
			let response = await request(server.app)
				.post("/dataset/query")
				.send(query)
				.set("Content-Type", "application/json");
			return response;
		} catch (err) {
			console.error(err);
			throw err;
		}
	}
	async function deleteDataset(id: string) {
		try {
			let response = await request(server.app).delete(`/dataset/${id}`);
			return response;
		} catch (err) {
			console.error(err);
			throw err;
		}
	}
	async function getDatasets() {
		try {
			let response = await request(server.app).get("/datasets").set("Content-Type", "application/json");
			return response;
		} catch (err) {
			console.error(err);
			throw err;
		}
	}
});
