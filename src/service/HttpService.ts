 
import http, {IncomingMessage} from 'http';

 export function fetchData(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      http
        .get(url, (res: IncomingMessage) => {
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          res.on('end', () => {
            resolve(data);
          });
        })
        .on('error', error => {
          reject(error);
        });
    });
  }