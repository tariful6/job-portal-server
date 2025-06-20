const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yy3zscc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobCollection = client.db("jobPortal").collection("jobs");
    const applicationCollection = client.db("jobPortal").collection("applications");

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if(email){
        query = {hr_email : email}
      }
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.post('/jobs', async(req, res)=>{
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result)
    })

    app.get("/jobApplication", async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };
      const result = await applicationCollection.find(query).toArray();

      //   fokira way to aggregate data ---
      for (const application of result) {
        console.log(application.job_id);
        const query1 = { _id: new ObjectId(application.job_id) };
        const job = await jobCollection.findOne(query1);
        if (job) {
          application.title = job.title;
          application.location = job.location;
          application.company = job.company;
          application.company_logo = job.company_logo;
        }
      }
      res.send(result);
    });


    app.get('/jobApplication/jobs/:job_id', async(req, res)=>{
      const jobId = req.params.job_id;
      const query = {job_id : jobId};
      const result = await applicationCollection.find(query).toArray()
      res.send(result)
    })


    app.post("/jobApplication", async (req, res) => {
      const application = req.body;
      const result = await applicationCollection.insertOne(application);

      // not the best way (use aggregate) 
      // skip --
      const id = application.job_id;
      const query = {_id: new ObjectId(id)}
      const job = await jobCollection.findOne(query);
      let newCount = 0;
      if(job.applicationCount){
        newCount = job.applicationCount + 1;
      }else{
        newCount = 1;
      }
      // now update job info -----
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
        $set :{
          applicationCount : newCount
        }
      }

      const updateResult = await jobCollection.updateOne(filter, updateDoc)

      res.send(result);
    });

    app.patch('/jobApplication/:id', async(req, res)=>{
      const id = req.params.id;
      const data = req.body;
      const query = {_id: new ObjectId(id)} 
      const updatedDoc = {
         $set: {
          status : data.status
         } 
        }
      const result = await applicationCollection.updateOne(query,updatedDoc);
      res.send(result)

    })

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

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`server is running on port - ${port}`);
});
