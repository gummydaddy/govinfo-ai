// src/services/clustering.service.ts - Hierarchical Clustering for Knowledge Base Organization

import { Injectable } from '@angular/core';
import { KnowledgebaseEntry } from '../models/interfaces';

/**
 * Simple TF-IDF vectorizer for text clustering
 */
class TFIDFVectorizer {
  private vocabulary: Map<string, number> = new Map();
  private idfValues: Map<string, number> = new Map();
  private fitted: boolean = false;

  fit(documents: string[][]): void {
    // Build vocabulary
    const termCounts: Map<string, number> = new Map();
    const docFrequency: Map<string, number> = new Map();

    documents.forEach((doc, docIndex) => {
      const seenInDoc = new Set<string>();
      doc.forEach(term => {
        if (!this.vocabulary.has(term)) {
          this.vocabulary.set(term, this.vocabulary.size);
        }
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
        if (!seenInDoc.has(term)) {
          docFrequency.set(term, (docFrequency.get(term) || 0) + 1);
          seenInDoc.add(term);
        }
      });
    });

    // Calculate IDF values
    const totalDocs = documents.length;
    this.vocabulary.forEach((index, term) => {
      const df = docFrequency.get(term) || 1;
      this.idfValues.set(term, Math.log(totalDocs / df) + 1);
    });

    this.fitted = true;
  }

  transform(document: string[]): number[] {
    if (!this.fitted) {
      throw new Error('Vectorizer not fitted. Call fit() first.');
    }

    const vector = new Array(this.vocabulary.size).fill(0);
    const termFreq: Map<string, number> = new Map();

    // Calculate term frequency
    document.forEach(term => {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    });

    // Calculate TF-IDF
    termFreq.forEach((freq, term) => {
      const index = this.vocabulary.get(term);
      if (index !== undefined) {
        const tf = freq / document.length;
        const idf = this.idfValues.get(term) || 1;
        vector[index] = tf * idf;
      }
    });

    return vector;
  }

  transformMany(documents: string[][]): number[][] {
    return documents.map(doc => this.transform(doc));
  }
}

/**
 * Simple hierarchical clustering (agglomerative) implementation
 */
class HierarchicalClusterer {
  private linkage: 'single' | 'complete' | 'average' = 'average';

  constructor(linkage: 'single' | 'complete' | 'average' = 'average') {
    this.linkage = linkage;
  }

  private euclideanDistance(vec1: number[], vec2: number[]): number {
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
      const diff = vec1[i] - vec2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

   private clusterDistance(cluster1: number[], cluster2: number[], vectors: number[][]): number {
     let minDist = Infinity;
     let maxDist = 0;
     let sumDist = 0;
     let count = 0;

     for (const i of cluster1) {
       for (const j of cluster2) {
         const dist = this.euclideanDistance(vectors[i], vectors[j]);
         if (this.linkage === 'single') {
           minDist = Math.min(minDist, dist);
         } else if (this.linkage === 'complete') {
           maxDist = Math.max(maxDist, dist);
         } else { // average
           sumDist += dist;
           count++;
         }
       }
     }

     if (this.linkage === 'single') return minDist;
     if (this.linkage === 'complete') return maxDist;
     return count > 0 ? sumDist / count : 0;
   }

  fit(vectors: number[][]): number[][] {
    const n = vectors.length;
    if (n <= 1) return [[0]];

    // Initialize clusters (each point is its own cluster)
    let clusters: number[][] = Array.from({ length: n }, (_, i) => [i]);
    const history: number[][] = [];

    while (clusters.length > 1) {
      // Find closest pair of clusters
      let minDistance = Infinity;
      let mergeI = -1;
      let mergeJ = -1;

        for (let i = 0; i < clusters.length; i++) {
          for (let j = i + 1; j < clusters.length; j++) {
            const dist = this.clusterDistance(clusters[i], clusters[j], vectors);
            if (dist < minDistance) {
              minDistance = dist;
              mergeI = i;
              mergeJ = j;
            }
          }
        }

      // Merge clusters
      if (mergeI !== -1 && mergeJ !== -1) {
        const mergedCluster = [...clusters[mergeI], ...clusters[mergeJ]];
        history.push([mergeI, mergeJ, mergedCluster.length, minDistance]);

        // Remove merged clusters and add new one
        const newClusters: number[][] = [];
        for (let k = 0; k < clusters.length; k++) {
          if (k !== mergeI && k !== mergeJ) {
            newClusters.push(clusters[k]);
          }
        }
        newClusters.push(mergedCluster);
        clusters = newClusters;
      } else {
        break;
      }
    }

    return history;
  }

  getClusterLabels(history: number[][], nClusters: number, nSamples: number): number[] {
    if (nClusters >= nSamples) {
      return Array.from({ length: nSamples }, (_, i) => i);
    }

    // Start with each sample in its own cluster
    let labels = Array.from({ length: nSamples }, (_, i) => i);
    let nextLabel = nSamples;

    // Process merging history in reverse to get nClusters
    const mergesToApply = history.length - (nClusters - 1);
    for (let i = Math.max(0, mergesToApply); i < history.length; i++) {
      const [cluster1Idx, cluster2Idx] = history[i];
      
      // Find which samples belong to each cluster being merged
      const cluster1Samples = new Set<number>();
      const cluster2Samples = new Set<number>();
      
      for (let j = 0; j < labels.length; j++) {
        if (labels[j] === cluster1Idx) cluster1Samples.add(j);
        if (labels[j] === cluster2Idx) cluster2Samples.add(j);
      }
      
      // Assign new label to all samples in merged cluster
      const mergedSamples = [...cluster1Samples, ...cluster2Samples];
      mergedSamples.forEach(sampleIdx => {
        labels[sampleIdx] = nextLabel;
      });
      
      nextLabel++;
    }

    // Relabel to be consecutive integers starting from 0
    const labelMap = new Map<number, number>();
    let currentLabel = 0;
    const uniqueLabels = [...new Set(labels)];
    uniqueLabels.forEach(label => labelMap.set(label, currentLabel++));
    
    return labels.map(label => labelMap.get(label)!);
  }
}

@Injectable({
  providedIn: 'root'
})
export class ClusteringService {
  private vectorizer: TFIDFVectorizer = new TFIDFVectorizer();
  private clusterer: HierarchicalClusterer = new HierarchicalClusterer('average');
  private entryVectors: number[][] = [];
  private clusterHistory: number[][] = [];
  private entryToCluster: Map<string, number> = new Map();
  private isFitted: boolean = false;

  /**
   * Fit the clustering model on knowledgebase entries
   */
  fit(entries: KnowledgebaseEntry[]): void {
    if (entries.length === 0) {
      this.isFitted = false;
      return;
    }

    // Extract question tokens for vectorization
    const tokenArrays: string[][] = entries.map(entry => entry.questionTokens);
    
    // Fit TF-IDF vectorizer
    this.vectorizer.fit(tokenArrays);
    
    // Transform entries to vectors
    this.entryVectors = this.vectorizer.transformMany(tokenArrays);
    
    // Perform hierarchical clustering
    this.clusterHistory = this.clusterer.fit(this.entryVectors);
    
    // Assign initial cluster labels (using sqrt(n) clusters as default)
    const nClusters = Math.max(1, Math.floor(Math.sqrt(entries.length)));
    const clusterLabels = this.clusterer.getClusterLabels(
      this.clusterHistory, 
      nClusters, 
      entries.length
    );
    
    // Map entries to their cluster labels
    this.entryToCluster.clear();
    entries.forEach((entry, index) => {
      this.entryToCluster.set(entry.id, clusterLabels[index]);
    });
    
    this.isFitted = true;
  }

  /**
   * Get cluster label for an entry
   */
  getClusterLabel(entryId: string): number | null {
    return this.entryToCluster.get(entryId) ?? null;
  }

  /**
   * Get entries belonging to a specific cluster
   */
  getEntriesInCluster(entries: KnowledgebaseEntry[], clusterLabel: number): KnowledgebaseEntry[] {
    return entries.filter(entry => 
      this.entryToCluster.get(entry.id) === clusterLabel
    );
  }

  /**
   * Search for similar entries within specific clusters
   */
  searchInClusters(
    query: string, 
    entries: KnowledgebaseEntry[], 
    context: any, // UserContext
    knowledgebaseService: any // KnowledgebaseService instance
  ): any { // KnowledgebaseMatch | null {
    if (!this.isFitted || entries.length === 0) {
      return null;
    }

    // Tokenize query
    const queryTokens = knowledgebaseService.tokenize(query);
    if (queryTokens.length === 0) {
      return null;
    }

    // Vectorize query
    const queryVector = this.vectorizer.transform(queryTokens);
    
    // Find most relevant clusters based on centroid similarity
    const clusterCentroids: Map<number, number[]> = new Map();
    const clusterCounts: Map<number, number> = new Map();

    // Calculate centroids for each cluster
    entries.forEach((entry, index) => {
      const clusterLabel = this.entryToCluster.get(entry.id);
      if (clusterLabel !== undefined) {
        const currentCentroid = clusterCentroids.get(clusterLabel) || 
          new Array(queryVector.length).fill(0);
        const count = clusterCounts.get(clusterLabel) || 0;
        
        // Update centroid
        const newCentroid = currentCentroid.map((val, i) => 
          val + (queryVector[i] - val) / (count + 1)
        );
        
        clusterCentroids.set(clusterLabel, newCentroid);
        clusterCounts.set(clusterLabel, count + 1);
      }
    });

    // Find closest cluster to query
    let bestClusterLabel = -1;
    let minDistance = Infinity;

    clusterCentroids.forEach((centroid, label) => {
      let distance = 0;
      for (let i = 0; i < centroid.length; i++) {
        const diff = centroid[i] - queryVector[i];
        distance += diff * diff;
      }
      distance = Math.sqrt(distance);
      
      if (distance < minDistance) {
        minDistance = distance;
        bestClusterLabel = label;
      }
    });

    // Search within the best cluster and nearby clusters
    const clusterLabelsToSearch = [bestClusterLabel];
    
    // Add neighboring clusters if they exist
    const allLabels = Array.from(clusterCentroids.keys());
    const bestIndex = allLabels.indexOf(bestClusterLabel);
    if (bestIndex > 0) clusterLabelsToSearch.push(allLabels[bestIndex - 1]);
    if (bestIndex < allLabels.length - 1) clusterLabelsToSearch.push(allLabels[bestIndex + 1]);

    // Search within selected clusters using original knowledgebase service logic
    let bestMatch: any = null;
    const questionTokens = queryTokens;

    entries.forEach(entry => {
      const entryCluster = this.entryToCluster.get(entry.id);
      if (entryCluster !== undefined && clusterLabelsToSearch.includes(entryCluster)) {
        // Calculate token similarity (reusing knowledgebase service method)
        const tokenSimilarity = knowledgebaseService.calculateSimilarity(
          questionTokens, 
          entry.questionTokens
        );
        
        // Calculate context similarity (reusing knowledgebase service method)
        const contextSimilarity = knowledgebaseService.contextMatch(entry, context);
        
        // Combined confidence score
        const confidence = 
          (tokenSimilarity * 0.7) +
          (contextSimilarity * 0.3);

        // Only consider matches above threshold
        if (confidence >= 0.5) {
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { entry, confidence };
          }
        }
      }
    });

    return bestMatch;
  }

  /**
   * Get clustering statistics
   */
  getStats(): any {
    return {
      isFitted: this.isFitted,
      totalEntries: this.entryToCluster.size,
      numberOfClusters: this.isFitted ? 
        Math.max(...Array.from(this.entryToCluster.values())) + 1 : 0,
      entriesPerCluster: this.isFitted ? 
        Array.from(this.entryToCluster.values()).reduce((acc, label) => {
          acc[label] = (acc[label] || 0) + 1;
          return acc;
        }, {} as Record<number, number>) : {}
    };
  }
}