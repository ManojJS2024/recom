const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const { MongoClient } = require('mongodb');
const { prompt } = require('enquirer');
var express = require('express');
var router = express.Router();


const bootstrap = async () => {
	const uri = 'mongodb+srv://haytistaging:ega6oxnvfaWxBDGK@stagingcluster.wgxcn.mongodb.net'; 
	client = new MongoClient(uri);
	await client.connect();
	database = client.db('hayti');
	collection = database.collection('artical_lists');
	genAI = new GoogleGenerativeAI("AIzaSyD2H14Lqt7eMuDlz5bgdpfzjjTxEGXJNY4");
	model = genAI.getGenerativeModel( { model: "text-embedding-004"} );

}

const now = () => {
	return Math.round(Date.now()/1000);
}



const generateEmbeding = async (prompt) => {
	console.log(`[${now()}] Generating Embedding for text: ${prompt}`);
	
	try {		
		const result = await model.embedContent(prompt);
		const embedding = result.embedding;
		return embedding.values;
	} catch(e) {
		console.log(`[${now()}] Error updating embeding for article id ${id}. The complete error is: `, e);
	}
}

const getRelevantDocs = async (vector) => {
console.log(vector);
	const pipeline = [{
		'$vectorSearch': {
			'index': 'vector_index',
			'path': 'embedding',
			'queryVector': vector,
			"filter": {category_id:{ $in: [2, 72, 221, 211] }, web_source_id: {$in: [287, 231, 286, 293, 42, 190, 232]}, created_at:{ $gte: new Date("2024-07-23")} } ,
			 	
			'numCandidates': 10000,
			'limit': 60
		}
        }, {
          '$project': {
            '_id': 0,
            'embedding': 0,
            'score': {
              '$meta': 'vectorSearchScore'
            }
          }
        },
         {
          '$project': {
            'title': 1,
            'category_desc': 1,
            'web_source_name': 1,
            'category_name': 1, 
            'created_at': 1,
            'score': 1
            
            
          }
        },
        {$sort: {created_at: -1}},
        {$skip: 0}



	];

	return await collection.aggregate(pipeline).toArray();
}

const main = async () =>  {
	await bootstrap();
	
	while (true) {
		
		const response = await prompt({
		  type: 'input',
		  name: 'prompt',
		  message: 'What do you wanna search?'
		});

		console.log(response);
		 const vector = await generateEmbeding(response.prompt);
		 console.log(JSON.stringify(vector));
		  const results = await getRelevantDocs(vector);
		 console.log(results);
	}
}
//main();



router.get('/index', async function(req, res, next) {
    await bootstrap();
	
	    //do {
		
		// const response = await prompt({
		//   type: 'input',
		//   name: 'prompt',
		//   message: 'What do you wanna search?'
		// });
		//console.log(response);

        let prompt = req.query.search;
		 const vector = await generateEmbeding(prompt);
		 console.log(JSON.stringify(vector));
		  const results = await getRelevantDocs(vector);
		 res.send(results);
	//}while (true)
});

module.exports = router;

