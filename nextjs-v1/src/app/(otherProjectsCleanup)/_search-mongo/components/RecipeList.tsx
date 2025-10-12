import React from 'react';
import Link from 'next/link';
import { items } from '../utils/data';

const RecipeList = async ({query}: {query: string}) => {
    // simulate loading:
    await new Promise(resolve => setTimeout(resolve, 1000));    
    const results = query ? items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase())) : items;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {results.map((item) => (
                <div key={item.title} className="bg-card rounded-lg p-4 border">
                    <h2 className="text-lg font-bold">{item.title}</h2>
                    <p className="text-sm text-muted-foreground">
                        {item.description}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default RecipeList;