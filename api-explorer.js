	const app = require('express')(),
		  server = require('http').createServer(app),
		  MongoClient = require('mongodb').MongoClient,
		  config = require('./config');

	server.listen(8080);

	app.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
		next();
	});

	app.get('/', (req, res) => {
		res.send('API for explorer.golos.io');
	});
	
	let getAccounts;
	let getComments;

	MongoClient.connect(config.mongoUrlConnect, { useNewUrlParser: true }, (err, client) => {
		if ( ! err) {
			const db = client.db('Golos');
			
			const account_object = db.collection('account_object');
			getAccounts = (query, callback) => {
				account_object
					.find(query.filterModel)
					.skip(query.startRow)
					.limit(query.endRow)
					.sort(query.sortModel)
					.toArray(/* (err, accounts) => {
						return accounts;
					} */)
					.then(accounts => accounts.map(account => {
						let profile_image = null;
						try {
							let jsonMetadata = JSON.parse(account.json_metadata);
							if (jsonMetadata.profile && jsonMetadata.profile.profile_image) profile_image = jsonMetadata.profile.profile_image;
						}
						catch (e) {
							//console.error(e);
						}
						return { created: account.created, name: account.name, post_count: account.post_count, vesting_shares_value: account.vesting_shares_value, balance_value: account.balance_value, sbd_balance_value: account.sbd_balance_value, profile_image: profile_image }
					}))
					.then(accounts => {
						account_object.countDocuments()
							.then(count => {
								if (Object.keys(query.filterModel).length != 0) count = accounts.length;
								callback({ lastRow: count, rows: accounts });
							});
					});
			}
			
			const comment_object = db.collection('comment_object');
			getComments = (query, callback) => {
				query.filterModel['parent_author'] = '';
				comment_object
					.find(query.filterModel)
					.skip(query.startRow)
					.limit(query.endRow)
					.sort(query.sortModel)
					.toArray(/* (err, accounts) => {
						return accounts;
					} */)
					.then(accounts => accounts.map(comment => {
						/* let profile_image = null;
						try {
							let jsonMetadata = JSON.parse(account.json_metadata);
							if (jsonMetadata.profile && jsonMetadata.profile.profile_image) profile_image = jsonMetadata.profile.profile_image;
						}
						catch (e) {
							//console.error(e);
						} */
						//console.log(comment);
						return { created: comment.created, author: comment.author, permlink: comment.permlink, title: comment.title, total_payout_symbol: comment.total_payout_symbol, total_payout_value: comment.total_payout_value, parent_permlink: comment.parent_permlink }
						//return comment;
					}))
					.then(comments => {
						comment_object.countDocuments()
							.then(count => {
								if (Object.keys(query.filterModel).length != 0) count = comments.length;
								callback({ lastRow: count, rows: comments });
							});
					});
			}
			
			//client.close();
			
		}
		else console.error(err);
		
	});
	
	let handlerReqAgGrid = (req) => {
		if (req.startRow) req.startRow = parseInt(req.startRow); else req.startRow = 0;
		if (req.endRow) req.endRow = parseInt(req.endRow); else req.endRow = 100;
		if (req.sortModel) {
			let sort = {};
			req.sortModel.forEach((row) => {
				sort[row.colId] = (row.sort == 'asc' ? 1 : -1);
			});
			req.sortModel = sort;
		}
		else req.sortModel = {};
		if (req.filterModel) {
			let find = {};
			for (let indexName in req.filterModel) {
				let findRow = req.filterModel[indexName];
				if (findRow.filterType == 'number') findRow.filter = parseFloat(findRow.filter);
				find[indexName] = findRow.filter;
			}
			req.filterModel = find;
		}
		else req.filterModel = {};
		console.log(req.filterModel);
		return req;
	};
	
	app.get('/getAccounts', (req, res) => {
		req.query = handlerReqAgGrid(req.query);
		getAccounts(req.query, (accounts) => {
			res.send(accounts);
		});
	});
	
	app.get('/getComments', (req, res) => {
		req.query = handlerReqAgGrid(req.query);
		getComments(req.query, (accounts) => {
			res.send(accounts);
		});
	});
