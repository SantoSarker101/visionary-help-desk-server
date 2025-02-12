const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xrsgd45.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


	const usersCollection = client.db('visionaryDb').collection('users');
	const ticketsCollection = client.db('visionaryDb').collection('tickets');
	// const messagesCollection = client.db('visionaryDb').collection('messages');

	// jwt related api
	app.post('/jwt', async (req, res) => {
		const user = req.body;
		const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '9000h' });
		res.send({ token });
	  })


	  // Middlewares
	  const verifyToken = (req, res, next) => {
		console.log('Inside verify token',req.headers.authorization);
		if(!req.headers.authorization){
		  return res.status(401).send({ message: 'Unauthorize Access' })
		}
		const token = req.headers.authorization.split(' ')[1];
		jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
		  if(err){
			return res.status(401).send({ message: 'Unauthorize Access' })
		  }
		  req.decoded = decoded;
		  next();
		})

	  }


	  // use verify admin after verifyToken
  const verifyAdmin = async(req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    const isAdmin = user?.role === 'Admin';
    if(!isAdmin){
      return res.status(403).send({ message: 'Forbidden Access' })
    }
    next();
  }


	// users related api

	app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
		console.log(req.headers);
		const result = await usersCollection.find().toArray();
		res.send(result);
	  })

	  app.get('/users/admin/:email', verifyToken, async (req, res) => {
		const email = req.params.email;
		if(email !== req.decoded.email){
		  return res.status(403).send({ message: 'Forbidden Access' })
		}

		const query = { email: email };
		const user = await usersCollection.findOne(query);
		let Admin = false;
		if(user){
		  Admin = user?.role === 'Admin';
		}
		res.send({ Admin })
	  })

	app.post('/users', async(req, res) => {
		const user = req.body
		const query = { email: user.email }
		const existingUser = await usersCollection.findOne(query);
		if(existingUser){
		  return res.send({ message: 'user already exists', insertedId: null })
		}
		result = await usersCollection.insertOne(user)
		res.send(result);
	})


	app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
		const id = req.params.id;
		const filter = { _id: new ObjectId(id)
	 }
		const updatedDoc = {
		  $set: {
			role: 'Admin'
		  }
		}
		const result = await usersCollection.updateOne(filter, updatedDoc);
		res.send(result);
	  })

	  app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id)
	 }
		const result = await usersCollection.deleteOne(query);
		res.send(result);
	  })



	//   Ticket Related API
	app.post('/tickets', async(req, res) => {
		const tickets = req.body
		result = await ticketsCollection.insertOne(tickets)
		res.send(result);
	})

	app.get('/tickets', verifyToken, async(req, res) =>{
		const email = req.query.email;
		const query = { email: email }
		const result = await ticketsCollection.find(query).toArray();
		res.send(result);
	  })

	  app.get('/tickets/:id', async (req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id) }
		const result = await ticketsCollection.findOne(query);
		res.send(result);
	  })

	  app.delete('/tickets/:id', verifyToken, async (req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id)
	 }
		const result = await ticketsCollection.deleteOne(query);
		res.send(result);
	  })

	  app.patch('/tickets/:id', verifyToken, async (req, res) => {
		const ticketInfo = req.body;
		const id = req.params.id;
		const filter = { _id: new ObjectId(id) };
		const updatedDoc = {
		  $set: {
			subject: ticketInfo.subject,
			description: ticketInfo.description,
			status: ticketInfo.status
		  }
		}
		const result = await ticketsCollection.updateOne(filter, updatedDoc);
		res.send(result);
	  })



	  app.get('/ticket', verifyToken, verifyAdmin, async(req, res) =>{
		const result = await ticketsCollection.find().toArray();
		res.send(result);
	  })



	  // Created Class status Approved API
	  app.patch('/ticket/resolved/:id', async (req, res) => {
		const id = req.params.id
		const filter = { _id: new ObjectId(id) }
		const updatedDoc = {
		  $set: {
			status: 'Resolved'
		  }
		}
		const result = await ticketsCollection.updateOne(filter, updatedDoc);
		res.send(result)
	  })



	  // Created tickets status Denied API
	  app.patch('/ticket/deny/:id', async (req, res) => {
		const id = req.params.id
		const filter = { _id: new ObjectId(id) }
		const updatedDoc = {
		  $set: {
			status: 'Denied'
		  }
		}
		const result = await ticketsCollection.updateOne(filter, updatedDoc);
		res.send(result)
    })


	// Message Related API
	// app.post('/message/:id', async(req, res) => {
	// 	const id = req.params.id
	// 	const filter = { _id: new ObjectId(id) }
	// 	const message = req.body
	// 	result = await messagesCollection.insertOne(filter, message)
	// 	res.send(result);
	// })




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
	res.send('Visionary Help Desk is Running')
})

app.listen(port, () => {
	console.log(`Visionary help desk is Running on Port ${port}`);
})