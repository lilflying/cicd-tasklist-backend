import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		// Clean up database between tests
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});

		it("should return 400 when the title is missing", async () => {
			const res = await request(app).post("/api/tasks").send({});

			expect(res.status).toBe(400);
		});
	});

	describe("GET /api/tasks", () => {
		it("should return the list of created tasks", async () => {
			await request(app).post("/api/tasks").send({ title: "Task A" });
			await request(app).post("/api/tasks").send({ title: "Task B" });

			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(2);
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should return a single task", async () => {
			const created = await request(app).post("/api/tasks").send({ title: "Task A" });

			const res = await request(app).get(`/api/tasks/${created.body.id}`);

			expect(res.status).toBe(200);
			expect(res.body.title).toBe("Task A");
		});

		it("should return 404 for an unknown task", async () => {
			const res = await request(app).get("/api/tasks/999999");

			expect(res.status).toBe(404);
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update a task", async () => {
			const created = await request(app).post("/api/tasks").send({ title: "Task A" });

			const res = await request(app)
				.put(`/api/tasks/${created.body.id}`)
				.send({ completed: true });

			expect(res.status).toBe(200);
			expect(res.body.completed).toBe(true);
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete a task", async () => {
			const created = await request(app).post("/api/tasks").send({ title: "Task A" });

			const res = await request(app).delete(`/api/tasks/${created.body.id}`);
			expect(res.status).toBe(204);

			const getRes = await request(app).get(`/api/tasks/${created.body.id}`);
			expect(getRes.status).toBe(404);
		});
	});
});
