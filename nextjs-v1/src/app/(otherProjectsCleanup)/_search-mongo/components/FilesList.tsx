import React from 'react';
import Link from 'next/link';
import { mongoSearchApi } from '../utils/api';
import { FileUploadedData } from '@sraz-sw/carwise-shared';
import { formatDistanceToNow } from 'date-fns';

interface FilesListProps {
	query: string;
}

const FilesList = async ({ query }: FilesListProps) => {
	// Fetch data from API
	let files: FileUploadedData[] = [];
	try {
		const response = query
			? await mongoSearchApi.searchSnippetsGetFiles(query)
			: //   ? await mongoSearchApi.searchFiles(query)
			  await mongoSearchApi.getAllFiles();
		files = response.data;
	} catch (error) {
		console.error('Error fetching files:', error);
	}

	if (files.length === 0) {
		return (
			<div className="text-center p-8">
				<h3 className="text-lg font-medium">No files found</h3>
				<p className="text-sm text-muted-foreground mt-2">
					{query ? `No results for "${query}"` : 'Upload some files to get started'}
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
			{files.map((file) => (
				<Link href={`/search-mongo/file/${file.id}`} key={file.id}>
					<div className="bg-card rounded-lg p-4 border hover:border-primary hover:shadow-md transition-all">
						<div className="flex items-center gap-3 mb-2">
							<FileIcon type={file.fileType} />
							<h2 className="text-lg font-bold truncate">{file.fileName}</h2>
						</div>

						<div className="text-sm text-muted-foreground mb-3">
							<p>Type: {file.fileType}</p>
							<p>Size: {formatFileSize(file.size)}</p>
							<p>Uploaded: {formatDistanceToNow(new Date(file.uploadAt), { addSuffix: true })}</p>
						</div>

						{file.snippets && file.snippets.length > 0 && (
							<div className="mt-2">
								<p className="text-xs font-medium text-muted-foreground">
									{file.snippets.length} snippets
								</p>
							</div>
						)}

						{file.contentTypeHighLevel && file.contentTypeHighLevel.length > 0 && (
							<div className="flex flex-wrap gap-1 mt-2">
								{file.contentTypeHighLevel.map((tag) => (
									<span
										key={tag}
										className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
									>
										{tag}
									</span>
								))}
							</div>
						)}
					</div>
				</Link>
			))}
		</div>
	);
};

// Helper component for file type icon
const FileIcon = ({ type }: { type: string }) => {
	// Simple icon mapping based on file type
	const iconClass =
		type === 'image' ? '📷' : type === 'video' ? '🎬' : type === 'audio' ? '🎵' : type === 'document' ? '📄' : '📁';

	return <span className="text-xl">{iconClass}</span>;
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default FilesList;
