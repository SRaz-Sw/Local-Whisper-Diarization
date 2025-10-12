import { ActionSearchBar } from './components/action-search-bar';
import RecipeList from './components/RecipeList';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import FilesList from './components/FilesList';
type MongoHomeProps = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SearchMongo({ searchParams }: MongoHomeProps) {
	const query = (await searchParams).q as string;
	return (
		<main className="min-h-screen py-12 px-16 max-w-6xl mx-auto ">
			<h1 className="text-2xl font-bold">Search MongoDB</h1>
            {/* Searchbar - suspense since wer're using searchParams inside it */}
            <Suspense fallback={<div className='text-center text-muted-foreground mx-auto'> <Loader2 className='animate-spin mx-auto' /></div>}>
                <ActionSearchBar />
            </Suspense>
			<div className="mt-4">
				{/* <Suspense
					key={query}
					fallback={
						<div className="text-center text-muted-foreground mx-auto">
							{' '}
							<Loader2 className="animate-spin mx-auto" />
						</div>
					}
				>
					<RecipeList query={query} />
				</Suspense> */}
                <Suspense
					key={query}
					fallback={
						<div className="text-center text-muted-foreground mx-auto">
							{' '}
							<Loader2 className="animate-spin mx-auto" />
						</div>
					}
				>
					<FilesList query={query} />
				</Suspense>
			</div>
		</main>
	);
}
