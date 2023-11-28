const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ctziwlh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const userCollection = client.db("inventoryDB").collection("users");
const shopCollection = client.db("inventoryDB").collection("shops");
const productCollection = client.db("inventoryDB").collection("products");
const saleCollection = client.db("inventoryDB").collection("sales");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//jwt related api
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
    expiresIn: "1h",
  });
  res.send({ token });
});

const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// use verify admin after verifyToken
const verifyShopOwner = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isManager = user?.role === "manager";
  if (!isManager) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

// verify shopOwner
app.get("/users/manager/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  if (email !== req.decoded.email) {
    return req.status(403).send({ message: "forbidden access" });
  }
  const query = { email: email };
  const user = await userCollection.findOne(query);
  let manager = false;
  if (user) {
    manager = user?.role === "manager";
  }
  res.send({ manager });
});

// user related apis ------------------------------------------

// get users
app.get("/users", async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

// get a specific user
app.get("/users/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const result = await userCollection.find(query).toArray();
  res.send(result);
});

// update user info
app.put("/users/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const updatedUserInfo = req.body;
  const options = { upsert: true };
  const UpdatedDoc = {
    $set: {
      role: "manager",
      shop_id: updatedUserInfo.shop_id,
      shop_name: updatedUserInfo.shop_name,
      shop_logo: updatedUserInfo.shop_logo,
    },
  };
  const result = await userCollection.updateOne(query, UpdatedDoc, options);
  res.send(result);
});

// post a new user
app.post("/users", async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "User already exist", insertedId: null });
  }
  const result = await userCollection.insertOne(user);
  res.send(result);
});

// delete a user
app.delete("/users/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await userCollection.deleteOne(query);
  res.send(result);
});

// shop related api -----------------------------------------

// create shop
app.post("/shops", async (req, res) => {
  const shopInfo = req.body;
  const result = await shopCollection.insertOne(shopInfo);
  res.send(result);
});

// get shop
app.get("/shops", async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const result = await shopCollection.find(query).toArray();
  res.send(result);
});

// patch shop data
app.patch("/shop/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const updatedCount = req.body;
  const filter = { _id: new ObjectId(id) };
  const UpdatedDoc = {
    $set: {
      product_count: updatedCount.product_count,
    },
  };
  const result = await shopCollection.updateOne(filter, UpdatedDoc);
  res.send(result);
});

// product related api -----------------------------

// add a product
app.post("/products", verifyToken, async (req, res) => {
  const product = req.body;
  const result = await productCollection.insertOne(product);
  res.send(result);
});

// get products
app.get("/products", async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const result = await productCollection.find(query).toArray();
  res.send(result);
});

//get a specific product
app.get("/products/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await productCollection.findOne(query);
  res.send(result);
});

// update specific field
app.patch("/patch/products/:id", async (req, res) => {
  const id = req.params.id;
  const newUpdate = req.body;
  const filter = { _id: new ObjectId(id) };
  const UpdateDoc = {
    $set: {
      product_quantity: newUpdate.product_quantity,
      sale_count: newUpdate.sale_count,
    },
  };
  const result = await productCollection.updateOne(filter, UpdateDoc);
  res.send(result);
});

// update a single product
app.put("/products/:id", async (req, res) => {
  const id = req.params.id;
  const updatedProduct = req.body;
  const filter = { _id: new ObjectId(id) };
  const UpdateDoc = {
    $set: {
      details: updatedProduct.details,
      discount: updatedProduct.discount,
      product_name: updatedProduct.product_name,
      production_cost: updatedProduct.production_cost,
      product_location: updatedProduct.product_location,
      profit: updatedProduct.profit,
      product_quantity: updatedProduct.product_quantity,
      image: updatedProduct.image,
      selling_price: updatedProduct.selling_price,
    },
  };
  const result = await productCollection.updateOne(filter, UpdateDoc);
  res.send(result);
});

// delete a product

app.delete("/products/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await productCollection.deleteOne(query);
  console.log(result);
  res.send(result);
});

// sale-summary --------------------------------------

// post summary
app.post("/sales", async (req, res) => {
  const summary = req.body;
  const result = await saleCollection.insertOne(summary);
  res.send(result);
});

// home ------------------------------------------------

app.get("/", (req, res) => {
  res.send("Inventory Management Server is running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
