import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";
import { createPostInput, updatePostInput } from "@ethan-0077/medium-common-types";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

// Middleware to verify JWT and set userId
blogRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  try {
    const user = await verify(token, c.env.JWT_SECRET);
    if (user && typeof user.id === "string") {
      c.set("userId", user.id);
      await next();
    } else {
      c.status(403);
      return c.json({ message: "You are not logged in" });
    }
  } catch (err) {
    c.status(403);
    return c.json({ message: "Invalid or expired token" });
  }
});

// Create a new blog post
blogRouter.post("/", async (c) => {
  const authorId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success, error } = createPostInput.safeParse(body);

  if (!success) { 
	  c.status(400)
  return  c.json({ error: "Invalid input for creating a post" });
  }

  try {
    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId,
      },
    });
    return c.json({ id: post.id });
  } catch (err) {
    console.error("Error creating post:", err);
    c.status(500);
    return c.json({ error: "Failed to create post" });
  }
});

// Update an existing blog post
blogRouter.put("/", async (c) => {
  const userId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success, error } = updatePostInput.safeParse(body);

  if (!success) {
   c.status(400)
	return c.json({ error: "Invalid input for updating a post" });
  }

  try {
    await prisma.post.update({
      where: {
        id: body.id,
        authorId: userId,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });
    return c.text("Blog updated successfully");
  } catch (err) {
    console.error("Error updating blog:", err);
    c.status(500);
    return c.json({ error: "Failed to update blog" });
  }
});

// Fetch posts with pagination
blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "10", 10);
  const skip = (page - 1) * limit;

  try {
    const posts = await prisma.post.findMany({ skip, take: limit });
    const totalPosts = await prisma.post.count();

    return c.json({
      data: posts,
      meta: {
        totalPosts,
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        limit,
      },
    });
  } catch (err) {
    console.error("Error fetching posts:", err);
    c.status(500);
    return c.json({ error: "Failed to fetch posts" });
  }
});

// Fetch a single post by ID
blogRouter.get("/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const id = c.req.param("id");

  try {
    const post = await prisma.post.findFirst({ where: { id } });

    if (!post) {
      c.status(404);
      return c.json({ error: "Post not found" });
    }

    return c.json({ post });
  } catch (err) {
    console.error("Error fetching post:", err);
    c.status(500);
    return c.json({ error: "Failed to fetch post" });
  }
});
