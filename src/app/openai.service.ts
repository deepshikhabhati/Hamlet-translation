import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { BehaviorSubject } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class OpenaiService {
  private ocrApiKey = ''; // Set locally; never commit real keys to GitHub
  private ocrApiUrl = 'https://api.openai.com/v1/chat/completions'; // Change based on your use case
  queries = [
    {
     key: 'Query 1',
     value: "How is user feedback used in scientific visualization design?",
     modifiedValue: ''
    },
    {
      key: 'Query 2',
      value: "How is user-centered design applied in simulation tools?",
        modifiedValue: ''
     },
     {
      key: 'Query 3',
      value: "How is virtual reality used for medical training?",
        modifiedValue: ''
     },
     {
      key: 'Query 4',
      value: "What are the benefits of using VR in healthcare?",
        modifiedValue: ''
     },
     {
      key: 'Query 5',
      value: "What are common metrics for graph layout quality?",
        modifiedValue: ''
     },
     {
      key: 'Query 6',
      value: "How is clutter measured in graph visualizations?",
        modifiedValue: ''
     },];

  private selectedQuery = new BehaviorSubject<string>('');
  selectedQuery$ = this.selectedQuery.asObservable();
  
  updateModifiedValue(querySelected: any, newValue: string): void {
    const match = this.queries.find(q => q.value === querySelected);
    if (match) {
      match.modifiedValue = newValue;
    }
  }
  private selectedSetOperation = new BehaviorSubject<string>('');
  selectedSetOperation$ = this.selectedSetOperation.asObservable();
  
  setQuery(query: any) {
  this.selectedQuery.next(query);
  }
  
  setSetOperation(op: string) {
  this.selectedSetOperation.next(op);
  }
  constructor(private http: HttpClient) {}

  generateResponse(prompt: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.ocrApiKey}`
    });

    const body = {
      model: 'gpt-3.5-turbo', // or any model you want to use
      messages: [{ role: 'user', content: prompt }]
    };

    return this.http.post<any>(this.ocrApiUrl, body, { headers });
  }

  getHeatmapData(): Observable<any> {
    // return this.http.post("http://127.0.0.1:8000/process_pdf/", {});
    let results: any = {
      "matrix": [
        [
          [
            0.4102860689163208
          ]
        ],
        [
          [
            0.5778585076332092
          ]
        ]
      ],
      "chunks": [
        "Virginia Tech Montgomery Executive Airport (IATA: BCB, ICAO: KBCB, FAA LID: BCB) is a public  airport named for nearby Virginia Tech and located three miles (5 km) south of the central business  district of Blacksburg, a town in Montgomery County, Virginia, United States. []1[]  Virginia Tech Montgomery Executive Airport covers an area of 248 acres (100 ha) and contains one  asphalt paved runway, designated 13/31 and measuring 5500 x 100 ft (1,700 x 30 m). For the period ending August 1, 2020, the airport had 16,700 aircraft operations, an average of 45  per day: 96% general aviation, 2% air taxi and 2% military. []1[] BCB is an instrument ﬂight rules  airport with GPS approaches to both runways, a LOC/DME approach to runway 12, a non-precision  NDB approach, and an automated weather observing system (AWOS-3).",
        "[]2[]  The airport oaicially opened in 1931 as VPI Airport (Virginia Tech was previously abbreviated VPI). University cadets trained to ﬂy there during World War II. A new terminal building was completed in  1996, and the airport took its current name in 2002. []3[]"
      ]
    }
    return of(results)
  }

  async  generateImageResponse() {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.ocrApiKey}`
    });

    const body = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "suggest " },
            {
              type: "image_url",
              image_url: {
                "url": "https://cdn.boldbi.com/wp/blogs/combo-chart/combo-chart-example.webp",
              },
            },
          ],
        },
      ],
    };

    return this.http.post<any>(this.ocrApiUrl, body, { headers }).subscribe((res: any) => console.log(res));
  }

  getExternalData(file: any): void {

    const headers: any = {
      'content-type': 'application/pdf'
    }

    this.http.post('http://127.0.0.1:8000/process_pdf',file,headers).subscribe((res: any) => console.log(res))
  }

  convertImageUrlToBase64(url: string): Promise<string> {
    return fetch(url)
      .then(response => response.blob()) // Fetch the image as a Blob
      .then(blob => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string; // Contains full Data URL with prefix
            resolve(base64String); // Return the full Data URL (including prefix)
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob); // Read Blob as Base64 Data URL (with prefix)
        });
      });
  }

public sendPDF(file: File,query: any,table?: any) {

  const formData = new FormData();
    formData.append('file', file); 
  return this.http.post('http://127.0.0.1:8000/upload-pdf/?query_value=' + table + '&model=' + query,formData,{ headers: {
    "Accept": "application/pdf"
  },})
}

compareSummaries(summaries: any[]): Observable<any> {
  const payload = {
    text_a:  summaries[0].content,
    text_b: summaries[1].content
  };

  return this.http.post(`http://127.0.0.1:8000/compare-summaries`, payload);
}

getSummary(summaries: any[]): Observable<any> {
  const payload = {
    chunks:  summaries,
  };

  return this.http.post(`http://127.0.0.1:8000/summarize`, payload);
}

compareText(summaries: any[],query1: any,query2: any): Observable<any> {
  const payload = {
    query1: query1,
    query2: query2,
    chunk1:  summaries[0].text,
    chunk2: summaries[1].text
  };

  return this.http.post(`http://127.0.0.1:8000/analyze`, payload);
}

public getScatterPlotData() {
  return this.http.get('http://127.0.0.1:8000/getScatter/')
}

public sendQuery(query: any,k?: any,model?: any) {

  const request: any = {
 
    text: query,
    chunks: k

  }
  return this.http.post('http://127.0.0.1:8000/find-similar/',request)
}

public sendQuery3(query: any,k?: any,model?: any) {

  const request: any = {
 
    text: query,
    chunks: k

  }
  return this.http.post('https://fastapi-pl5q.onrender.com/find-similar-adam/',request)
}

public sendQuery4(query: any,k?: any,model?: any) {

  const request: any = {
 
    text: query,
    chunks: k

  }
  return this.http.post('http://127.0.0.1:8000/find-similar-AI/',request)
}

public sendQueryGerman(query: any,k?: any,model?: any) {
  const request: any = {
    text: query,
    chunks: k
  }
  return this.http.post('http://127.0.0.1:8000/find-similar-german-hamlet/',request)
}

public sendQueryFullReduced(query: any,k?: any,model?: any) {

  const request: any = {
 
    text: query,
    chunks: k

  }
  return this.http.post('http://127.0.0.1:8000/find-similar-full-reduced/',request)
}

public extract_paragraph(query: any) {

  return this.http.get('http://127.0.0.1:8000/extract_paragraph?query='+ query)
}


public highlight_and_return_image(query: any) {

  return this.http.get('http://127.0.0.1:8000/highlight_and_return_image?query='+ query)
}

public sendQueryNews(query: any,type?: any,k?: any) {

  return this.http.get('http://127.0.0.1:8000/search?query='+ query)
}

public analyze(images: any,prompt?: any) {

  return this.http.post<any>('http://127.0.0.1:8000/clipscore-and-entropy', {
    images,
    prompt
  });

  
}
public sendQueryNews3(query: any,type?: any,k?: any) {

  return this.http.get('http://127.0.0.1:8000/tsvgsearch?query='+ query +'&top_k=' + type)
}

public sendQueryNews4(query: any,k?: any,model?: any) {

  return this.http.get('http://127.0.0.1:8000/tsvgsearch2?query1='+ query + '&query2=' + k + '&type=' + model)
}

public getRelevance(query: any,chunk: any) {
  const request: any = {
    chunk: chunk,
    query: query
  }
  return this.http.post('http://127.0.0.1:8000/check-relevance/',request)
}

public getBestPrompt(query: any,chunk: any) {

  const request: any = {
    chunk: chunk,
    query: query
  }
  return this.http.post('http://127.0.0.1:8000/generate-prompt/',request)
}

public sendQueryNews2(query: any,k?: any,model?: any) {

  return this.http.get('http://127.0.0.1:8000/search2?query1='+ query + '&query2=' + k + '&type=' + model)
}

public findFuzzy(query: any,query2?: any,chunks?: any,type1?: any) {

  const request: any = {
    query1: query,
    query2: query2,
    chunks: chunks,
    type: type1
  }
  return this.http.post('http://127.0.0.1:8000/find-fuzzy/',request)
}
public sendQuery2(query: any,k?: any,model?: any) {

  const request: any = {
 
    text: query,
    chunks:k

  }
  return this.http.post('http://127.0.0.1:8000/find-similar2/',request)
}

/** Hamlet Version 1: POST /find-similar-hamlet1 */
public findSimilarHamlet1(text: string, chunks: number): Observable<any> {
  return this.http.post('http://127.0.0.1:8000/find-similar-hamlet1', { text, chunks });
}

/** Hamlet Version 2: POST /find-similar-hamlet2 */
public findSimilarHamlet2(text: string, chunks: number): Observable<any> {
  return this.http.post('http://127.0.0.1:8000/find-similar-hamlet2', { text, chunks });
}

/** Hamlet Version 3: POST /find-similar-hamlet3 */
public findSimilarHamlet3(text: string, chunks: number): Observable<any> {
  return this.http.post('http://127.0.0.1:8000/find-similar-hamlet3', { text, chunks });
}


public findSummary(payload: any) {

  return this.http.post('http://127.0.0.1:8000/summarize/',payload)
}


public extract_keywords(payload: any) {

  return this.http.post('http://127.0.0.1:8000/extract_keywords/',payload)
}


public getdtaa() {
  return this.http.get("https://api-partner.desktop.eposapi.co.uk?api_key='3444CED48713B3DA2EC075CDDE7D562F'&action='getcategorySubcategory'")
}

public sendQueryfor3d(query: any,k: any,model: any) {

  const request: any = {
 
    query: query,
    table_name: k,
    model: model
  }
  return this.http.post('http://127.0.0.1:8000/queryFor3D/',request)
}

public askQuery(query: any,source: any, options?: { german?: boolean; language?: string }) {

  const request: any = {
    source: source,
    query: query,
    german: options?.german || false,
    language: options?.language || ''
  }
  return this.http.post('http://127.0.0.1:8000/ask-ai/',request)
}

/**
 * Cluster-AI: send query and top chunks for clustering.
 * @param query Current query text
 * @param k Number of clusters (e.g. 2)
 * @param chunks Array of { name, value } (top 5 from selected topic contents)
 */
public clusterAi(query: string, k: number, chunks: { name: string; value: string }[]): Observable<any> {
  const payload = { query, k, chunks };
  return this.http.post('http://127.0.0.1:8000/cluster-ai', payload);
}

public compareEmbeddingResults(payload: {
  english_query: string;
  german_query: string;
  english_paragraph: string;
  german_paragraph: string;
  model?: string;
}): Observable<any> {
  return this.http.post('http://127.0.0.1:8000/compare-embedding-results', payload);
}

}
