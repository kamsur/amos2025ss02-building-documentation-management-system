import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { ConfigService } from '../config.service';
import { Configuration, DocumentsApi } from '../../api';

export interface Category {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private documentsApi: DocumentsApi;
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  categories$ = this.categoriesSubject.asObservable();
  
  // Default categories - in a real application, these would come from the backend
  private defaultCategories: Category[] = [
    { id: 1, name: 'Architecture' },
    { id: 2, name: 'Electrical' },
    { id: 3, name: 'Plumbing' },
    { id: 4, name: 'HVAC' },
    { id: 5, name: 'Structural' },
    { id: 6, name: 'Civil' },
    { id: 7, name: 'Mechanical' },
    { id: 8, name: 'Other' }
  ];

  constructor(private config: ConfigService) {
    const configuration = new Configuration({ basePath: this.config.apiUrl });
    this.documentsApi = new DocumentsApi(configuration);
    
    // Initialize with default categories
    this.categoriesSubject.next(this.defaultCategories);
  }

  getCategories(): Observable<Category[]> {
    return this.categories$;
  }

  // In a real application, this would send the document category to the backend
  assignDocumentCategory(documentId: number, categoryId: number, buildingId: number): Observable<any> {
    // Use the OpenAPI client to update document metadata (category and building)
    return this.documentsApi.apiDocumentsIdPut(documentId, {
      categoryId: categoryId,
      buildingId: buildingId
    });
  }
  
  // Create a new category
  createCategory(category: { name: string }): Observable<Category> {
    // In a real application, this would send the new category to the backend
    // For now, we'll just add it to our local array with a new ID
    const newCategoryId = Math.max(...this.defaultCategories.map(c => c.id)) + 1;
    const newCategory: Category = {
      id: newCategoryId,
      name: category.name
    };
    
    this.defaultCategories.push(newCategory);
    this.categoriesSubject.next([...this.defaultCategories]);
    
    return from(Promise.resolve(newCategory));
  }
}
