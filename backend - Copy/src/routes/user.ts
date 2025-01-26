import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign, verify } from 'hono/jwt'
import { signinInput, signupInput } from "@ethan-0077/medium-common-types";

export const userRouter = new Hono<{
   // to access the gloabal & enviornment variable 
	Bindings: {
		DATABASE_URL: string,
		JWT_SECRET: string,
	},
   // export userID
	Variables : {
		userId: string
	}
}>();

//  /api/v1/signup-> /signup as /api/v1/user comes from userRouter from index.ts

userRouter.post('/signup', async (c) => {
   	const body = await c.req.json();
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

	const {success} = signupInput.safeParse(body);
	if(!success){
		return c.json({error: "the input is wrong "});
	}else{
		try {
			const user = await prisma.user.create({
				data: {
					email: body.email,
					password: body.password
				}
			});
	
			const jwt= await sign({id: user.id}, c.env.JWT_SECRET); 
			return c.json({jwt});
	
		} catch(e) {
			c.status(403);
			return c.json({error: "error while signing up"});
		}
	}

})

userRouter.post('/signin', async (c) => {
	const body = await c.req.json();
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

	const { success, error } = signinInput.safeParse(body);

	if (!success) {
		return c.json({ error: "The input is invalid" });
	} else {
		try {
			// Find the user by email
			const user = await prisma.user.findUnique({
				where: {
					email: body.email
				}
			});

			// If user is not found
			if (!user) {
				c.status(403);
				return c.json({ error: "User not found" });
			}

			// Assuming password validation logic (e.g., bcrypt.compare) is handled elsewhere
			if (body.password !== user.password) {
				c.status(403);
				return c.json({ error: "Invalid credentials" });
			}

			// Generate a JWT for the verified user
			const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
			return c.json({ jwt });
		} catch (e) {
			console.error("Error during signin:", e);
			c.status(500);
			return c.json({ error: "Error while signing in" });
		}
	}
});