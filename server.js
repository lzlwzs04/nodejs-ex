//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');

app.use(function(req, res, next) {
	req.rawBody = '';
	req.setEncoding('utf8');

	req.on('data', function(chunk) {
		req.rawBody += chunk;
	});

	req.on('end', function() {
		next();
	});
});

function authenticate(username, password, req, res) {
	var auth = req.get('Authorization');
	if (!auth) {
		res.status(401).send('Authorization is missing');
    }
    if (auth.startsWith('Basic')){
       	auth = auth.substring(6);
	    var authString = new Buffer(auth, 'base64').toString('ascii');
	    var inputUser = authString.trim().split(":")[0];
	    var inputPass = authString.trim().split(":")[1];
	
	    if(inputUser !== username || inputPass !== password) {
		    res.status(401).send('Authorization Failed ' + inputUser + ':' + inputPass);
	    } 
    }
}

    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.post('/v2',
				function(req, res) {
					authenticate('admin', 'pwd', req, res);
					if (res.finished) {
						return;
					}
					var responseBody = "<S:Envelope xmlns:S=\"http://schemas.xmlsoap.org/soap/envelope/\">";
					responseBody+="<S:Header><S:startup tenantid=\"0246bff8-40d5-4247-a439-0afa1cf07ad4\"></S:startup></S:Header>"
					responseBody += "<S:Body>";
					responseBody += "<ns2:ExternalEventResponse xmlns:ns2=\"http://notification.event.successfactors.com\">";
					responseBody += "<ns2:responsePayload>";
					responseBody += "<ns2:status>200</ns2:status>";
					responseBody += "<ns2:statusDate>" + new Date().toISOString() + "</ns2:statusDate>";
					responseBody += "<ns2:statusDetails><![CDATA[" + req.rawBody + "]]></ns2:statusDetails>";
					responseBody += "</ns2:responsePayload>";
					responseBody += "</ns2:ExternalEventResponse>";
					responseBody += "</S:Body>";
					responseBody += "</S:Envelope>";
					res.setHeader('Content-Type', 'text/xml; charset=utf-8');
					res.send(responseBody);
				});

app.post('/v1',
				function(req, res) {
					authenticate('admin', 'pwd', req, res);
					if (res.finished) {
						return;
					}
					var responseBody = "<S:Envelope xmlns:S=\"http://schemas.xmlsoap.org/soap/envelope/\">";
					responseBody += "<S:Body>";
					responseBody += "<ns2:ExternalEventResponse xmlns:ns2=\"com.successfactors.event.notification\">";
					responseBody += "<ns2:responsePayload>";
					responseBody += "<ns2:status>200</ns2:status>";
					responseBody += "<ns2:statusDate>" + new Date().toISOString() + "</ns2:statusDate>";
					responseBody += "<ns2:statusDetails><![CDATA[" + req.rawBody + "]]></ns2:statusDetails>";
					responseBody += "</ns2:responsePayload>";
					responseBody += "</ns2:ExternalEventResponse>";
					responseBody += "</S:Body>";
					responseBody += "</S:Envelope>";
					res.setHeader('Content-Type', 'text/xml; charset=utf-8');
					res.send(responseBody);
				});
				
app.post('/v3',
				function(req, res) {
					authenticate('admin', 'pwd', req, res);
					if (res.finished) {
						return;
					}
					var responseBody = "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"><soap:Header></soap:Header><soap:Body><ns1:ExternalEventResponse xmlns:ns1=\"com.successfactors.event.notification\">";
					responseBody += "<ns1:responsePayload>";
					responseBody += "<ns1:entityId>JobRequistion</ns1:entityId>";
					responseBody += "<ns1:status>0</ns1:status>";
					responseBody += "<ns1:statusDate>2017-01-01T00:00:00-01:00</ns1:statusDate>";
					responseBody += "<ns1:statusDetails>Success</ns1:statusDetails>";
					responseBody += "</ns1:responsePayload>";
					responseBody += "</ns1:ExternalEventResponse></soap:Body></soap:Envelope>";
					res.setHeader('Content-Type', 'text/xml; charset=utf-8');
					res.send(responseBody);
				});

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
