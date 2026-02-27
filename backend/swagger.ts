import swaggerJSDoc from "swagger-jsdoc";
import path from "path";

const docsPath = path.join(process.cwd(), "openapi.docs.ts").replace(/\\/g, "/");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Assignment 2 API", version: "1.0.0" },
    servers: [{ url: "http://localhost:3000" }],
  },
  apis: [docsPath],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export { swaggerSpec };
