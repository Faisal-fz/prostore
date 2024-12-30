import ProductCard from "./product-card";
import { Product } from '@/types';
const ProductList = 
({
    data,
    title,
    limit,
  }: {
    data: Product[];
    title?: string;
    limit?: number;
  }) => {
    //appply limit to the data
    const limitedData = limit ? data.slice(0, limit) : data;
    return (
        
        <div className="className='my-10'">
            <h2 className='h2-bold mb-4'>{title}</h2>
        {limitedData.length > 0 ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {limitedData.map((product: Product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
      ) : (
        <div>
          <p>No product found</p>
        </div>
      )}
        </div>
      
    );
  };
  
  export default ProductList;