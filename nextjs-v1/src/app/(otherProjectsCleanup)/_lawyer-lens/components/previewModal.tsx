'use client';

import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	FileText,
	FileAudio,
	FileVideo,
	FileImage,
	MessageSquare,
	FileType,
	X,
	ExternalLink,
	User,
	Building,
	MapPin,
	Tag,
	Phone,
	Mail,
	Globe,
} from 'lucide-react';
import Image from 'next/image';

// Import types from the shared package
import type { EntityData, SnippetData } from '@sraz-sw/carwise-shared';

// Import the store
import { usePreviewModalStore } from '../stores/previewModalStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Format date nicely
const formatDate = (date: Date): string => {
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
	}).format(date);
};

// Format file size
const formatBytes = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function PreviewModal() {
	// Get state and actions from the store
	const { isOpen, file, activeTab, close, setActiveTab } = usePreviewModalStore();

	// Return null if no file is available
	if (!file && isOpen) return null;

	// Get file icon based on mime type
	const getFileIcon = (mimeType: string): ReactNode => {
		if (mimeType.startsWith('application/pdf')) return <FileText className="h-6 w-6 text-red-600" />;
		if (mimeType.includes('wordprocessingml')) return <FileText className="h-6 w-6 text-blue-600" />;
		if (mimeType.startsWith('audio/')) return <FileAudio className="h-6 w-6 text-purple-600" />;
		if (mimeType.startsWith('video/')) return <FileVideo className="h-6 w-6 text-orange-600" />;
		if (mimeType.startsWith('image/')) return <FileImage className="h-6 w-6 text-green-600" />;
		if (mimeType.startsWith('text/')) return <MessageSquare className="h-6 w-6 text-gray-600" />;
		return <FileType className="h-6 w-6 text-gray-500" />;
	};

	// Get entity icon based on category
	const getEntityIcon = (category: string): ReactNode => {
		switch (category.toLowerCase()) {
			case 'person':
				return <User className="h-4 w-4" />;
			case 'organization':
				return <Building className="h-4 w-4" />;
			case 'location':
				return <MapPin className="h-4 w-4" />;
			default:
				return <Tag className="h-4 w-4" />;
		}
	};

	// No need to render the dialog if it's not open or no file is selected
	if (!isOpen || !file) return null;

	// Count entities by category
	const getEntityCounts = () => {
		if (!file.entities || file.entities.length === 0) return {};

		return file.entities.reduce((acc: Record<string, number>, entity: EntityData) => {
			const category = entity.category.toLowerCase();
			acc[category] = (acc[category] || 0) + 1;
			return acc;
		}, {});
	};

	const entityCounts = getEntityCounts();

	// Determine if there are snippets or entities to display
	const hasSnippets = file.snippets && file.snippets.length > 0;
	const hasEntities = file.entities && file.entities.length > 0;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<DialogContent
				className="w-[95%] max-w-full sm:max-w-[95%] md:max-w-2xl p-0 bg-accent overflow-hidden max-h-[90vh] h-[90vh] md:h-auto md:max-h-[80vh] flex flex-col rounded-t-lg md:rounded-lg mx-auto mt-[10vh] md:mt-0"
				aria-describedby="file-preview-description"
			>
				<DialogHeader className="bg-primary/90 text-primary-foreground p-4 sticky top-0 z-10">
					<div className="flex items-center justify-between w-full">
						<div className="flex items-center overflow-hidden mr-2">
							<div className="flex-shrink-0 mr-3">{getFileIcon(file.mimeType)}</div>
							<DialogTitle className="text-xl font-semibold truncate max-w-[calc(100%-40px)]">
								{file.fileName}
							</DialogTitle>
						</div>
						<DialogClose asChild>
							<Button
								variant="ghost"
								size="icon"
								className="text-primary-foreground hover:bg-primary/100 rounded-full flex-shrink-0"
								aria-label="Close dialog"
							>
								<X className="h-5 w-5" />
							</Button>
						</DialogClose>
					</div>
					<div className="sr-only" id="file-preview-description">
						File preview and details for {file.fileName}
					</div>
				</DialogHeader>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
					<div className="bg-secondary p-2 border-b">
						<TabsList className="grid grid-cols-2 sm:grid-cols-4">
							<TabsTrigger value="info">Info</TabsTrigger>
							<TabsTrigger value="snippets" disabled={!hasSnippets}>
								Snippets{hasSnippets ? ` (${file.snippets?.length})` : ''}
							</TabsTrigger>
							<TabsTrigger value="entities" disabled={!hasEntities}>
								Entities{hasEntities ? ` (${file.entities?.length})` : ''}
							</TabsTrigger>
							<TabsTrigger value="preview">Preview</TabsTrigger>
						</TabsList>
					</div>

					<div className="flex-1 overflow-hidden max-w-full mx-auto relative">
						{/* File Info Tab */}
						<TabsContent value="info" className="h-full m-0">
							<ScrollArea className="h-full">
								<div className="p-6 space-y-6 w-full">
									{/* Basic Info Card */}
									<Card className="max-w-[90%]">
										<CardHeader>
											<CardTitle>File Information</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="flex flex-col sm:flex-row items-start gap-4">
												<div className="min-w-[120px] h-[120px] flex items-center justify-center rounded bg-muted p-2">
													{file.fileUrl && file.fileType === 'image' ? (
														<Avatar className="h-full w-full">
															<AvatarImage
																src={file.fileUrl}
																alt={file.fileName}
																className="object-contain"
															/>
															<AvatarFallback>
																{getFileIcon(file.mimeType)}
															</AvatarFallback>
														</Avatar>
													) : (
														<div className="text-center">
															{getFileIcon(file.mimeType)}
															<p className="text-xs mt-2 text-muted-foreground">
																{file.fileType}
															</p>
														</div>
													)}
												</div>
												<div className="space-y-2 flex-1 w-full overflow-hidden">
													<div className="flex items-baseline w-full">
														<span className="text-muted-foreground text-sm whitespace-nowrap">
															Name:
														</span>
														<div className="ml-2 overflow-hidden w-full">
															<Tooltip>
																<TooltipTrigger asChild>
																	<span className="font-medium block truncate max-w-full">
																		{file.fileName}
																	</span>
																</TooltipTrigger>
																<TooltipContent side="top">
																	{file.fileName}
																</TooltipContent>
															</Tooltip>
														</div>
													</div>
													<div>
														<span className="text-muted-foreground text-sm">Type:</span>
														<span className="font-medium ml-2">{file.mimeType}</span>
													</div>
													<div>
														<span className="text-muted-foreground text-sm">Size:</span>
														<span className="font-medium ml-2">
															{formatBytes(file.size)}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground text-sm">
															Upload Date:
														</span>
														<span className="font-medium ml-2">
															{formatDate(file.uploadAt)}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground text-sm">Status:</span>
														<Badge
															variant={
																file.status === 'completed'
																	? 'default'
																	: file.status === 'error'
																	? 'destructive'
																	: 'outline'
															}
															className="ml-2"
														>
															{file.status}
														</Badge>
													</div>
												</div>
											</div>

											<div className="flex flex-wrap gap-2 mt-4">
												<span className="text-muted-foreground text-sm">Content Type:</span>
												{file.contentTypeHighLevel.map((type: string, index: number) => (
													<Badge key={index} variant="secondary">
														{type}
													</Badge>
												))}
											</div>

											<Button
												variant="outline"
												size="sm"
												className="mt-4"
												onClick={() => window.open(file.fileUrl, '_blank')}
											>
												<ExternalLink className="h-4 w-4 mr-2" />
												Open File
											</Button>
										</CardContent>
									</Card>

									{/* Additional Info Card (if available) */}
									{file.additionalInfo && Object.keys(file.additionalInfo).length > 0 && (
										<Card>
											<CardHeader>
												<CardTitle>Additional Information</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-2">
													{Object.entries(file.additionalInfo).map(([key, value]) => (
														<div key={key}>
															<span className="text-muted-foreground text-sm">
																{key}:
															</span>
															<span className="font-medium ml-2">
																{typeof value === 'object'
																	? JSON.stringify(value)
																	: String(value)}
															</span>
														</div>
													))}
												</div>
											</CardContent>
										</Card>
									)}
								</div>
							</ScrollArea>
						</TabsContent>

						{/* Snippets Tab */}
						<TabsContent value="snippets" className="h-full m-0">
							<ScrollArea className="h-full">
								<div className="p-6 space-y-4">
									{hasSnippets ? (
										file.snippets!.map((snippet: SnippetData) => (
											<Card key={snippet.id} className="mb-4">
												<CardHeader className="pb-2">
													<div className="flex justify-between items-start">
														<CardTitle className="text-base flex items-center gap-2">
															<Badge variant="outline" className="text-xs">
																{snippet.type}
															</Badge>
															<span className="text-sm text-muted-foreground">
																Position: {snippet.start.join(':')} -{' '}
																{snippet.end.join(':')}
															</span>
														</CardTitle>
														<Badge variant="secondary" className="text-xs">
															{formatDate(snippet.createdAt)}
														</Badge>
													</div>
												</CardHeader>
												<CardContent>
													{snippet.content && (
														<div className="bg-muted p-3 rounded text-sm mb-3 overflow-x-auto">
															<pre className="whitespace-pre-wrap">{snippet.content}</pre>
														</div>
													)}
													{snippet.summary && (
														<div className="mb-3">
															<span className="text-sm font-medium">Summary:</span>
															<p className="text-sm mt-1">{snippet.summary}</p>
														</div>
													)}
													{snippet.keywords && snippet.keywords.length > 0 && (
														<div className="flex flex-wrap gap-1 mt-2">
															{snippet.keywords.map((keyword: string, i: number) => (
																<Badge key={i} variant="outline" className="text-xs">
																	{keyword}
																</Badge>
															))}
														</div>
													)}
												</CardContent>
											</Card>
										))
									) : (
										<div className="text-center py-12 text-muted-foreground">
											No snippets available for this file
										</div>
									)}
								</div>
							</ScrollArea>
						</TabsContent>

						{/* Entities Tab */}
						<TabsContent value="entities" className="h-full m-0">
							<ScrollArea className="h-full">
								<div className="p-6">
									{/* Entity summary */}
									{hasEntities && (
										<div className="mb-6">
											<h3 className="text-sm font-medium mb-2">Entity Summary</h3>
											<div className="flex flex-wrap gap-2">
												{Object.entries(entityCounts).map(([category, count]) => (
													<Badge
														key={category}
														variant="outline"
														className="flex items-center gap-1"
													>
														{getEntityIcon(category)}
														<span className="capitalize">
															{category}: {count as number}
														</span>
													</Badge>
												))}
											</div>
										</div>
									)}

									{hasEntities ? (
										file.entities!.map((entity: EntityData) => (
											<Card key={entity.id} className="mb-4">
												<CardHeader className="pb-2">
													<div className="flex justify-between items-center truncate">
														<CardTitle className="text-base flex items-center gap-2">
															{getEntityIcon(entity.category)}
															{entity.name}
															{entity.confidence && (
																<Badge variant="outline" className="text-xs">
																	{(entity.confidence * 100).toFixed(0)}% confidence
																</Badge>
															)}
														</CardTitle>
														<Badge variant="secondary" className="text-xs capitalize">
															{entity.category}
														</Badge>
													</div>
												</CardHeader>
												<CardContent className="space-y-3">
													{entity.description && (
														<div>
															<span className="text-sm text-muted-foreground">
																Description:
															</span>
															<p className="text-sm">{entity.description}</p>
														</div>
													)}

													{entity.id_official && (
														<div className="flex items-center">
															<span className="text-sm text-muted-foreground mr-2">
																ID:
															</span>
															<span className="text-sm font-mono bg-muted px-1 rounded">
																{entity.id_official}
															</span>
														</div>
													)}

													{/* Contact information */}
													{(entity.email || entity.phoneNumber || entity.website) && (
														<div className="space-y-1">
															<span className="text-sm text-muted-foreground">
																Contact:
															</span>
															<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
																{entity.email && (
																	<div className="flex items-center text-sm">
																		<Mail className="h-3 w-3 mr-1" />
																		<a
																			href={`mailto:${entity.email}`}
																			className="text-primary hover:underline truncate"
																		>
																			{entity.email}
																		</a>
																	</div>
																)}
																{entity.phoneNumber && (
																	<div className="flex items-center text-sm">
																		<Phone className="h-3 w-3 mr-1" />
																		<a
																			href={`tel:${entity.phoneNumber}`}
																			className="text-primary hover:underline"
																		>
																			{entity.phoneNumber}
																		</a>
																	</div>
																)}
																{entity.website && (
																	<div className="flex items-center text-sm">
																		<Globe className="h-3 w-3 mr-1" />
																		<a
																			href={entity.website}
																			target="_blank"
																			rel="noopener noreferrer"
																			className="text-primary hover:underline truncate"
																		>
																			{entity.website.replace(/^https?:\/\//, '')}
																		</a>
																	</div>
																)}
															</div>
														</div>
													)}

													{/* Location information */}
													{entity.address && (
														<div className="flex items-start">
															<MapPin className="h-4 w-4 mr-1 mt-0.5 text-muted-foreground" />
															<span className="text-sm">{entity.address}</span>
														</div>
													)}

													{/* Keywords */}
													{entity.keywords && entity.keywords.length > 0 && (
														<div className="flex flex-wrap gap-1 mt-2">
															{entity.keywords.map((keyword: string, i: number) => (
																<Badge key={i} variant="outline" className="text-xs">
																	{keyword}
																</Badge>
															))}
														</div>
													)}
												</CardContent>
											</Card>
										))
									) : (
										<div className="text-center py-12 text-muted-foreground">
											No entities detected in this file
										</div>
									)}
								</div>
							</ScrollArea>
						</TabsContent>

						{/* Preview Tab */}
						<TabsContent value="preview" className="h-full m-0">
							<div className="h-full flex items-center justify-center bg-muted/30">
								{file.fileType === 'image' ? (
									<div className="max-h-full max-w-full p-6 flex items-center justify-center">
										<Image
											src={file.fileUrl}
											alt={file.fileName}
											className="max-h-full max-w-full object-contain"
										/>
									</div>
								) : file.fileType === 'document' && file.mimeType.includes('pdf') ? (
									<iframe
										src={`${file.fileUrl}#toolbar=0&navpanes=0`}
										className="w-full h-full"
										title={file.fileName}
									/>
								) : file.fileType === 'audio' ? (
									<div className="p-6 w-full max-w-md">
										<div className="bg-card p-6 rounded-lg shadow">
											<h3 className="text-lg font-medium mb-4 text-center">{file.fileName}</h3>
											<audio controls className="w-full">
												<source src={file.fileUrl} type={file.mimeType} />
												Your browser does not support the audio element.
											</audio>
										</div>
									</div>
								) : file.fileType === 'video' ? (
									<div className="p-6 w-full max-w-2xl">
										<div className="bg-card rounded-lg shadow overflow-hidden">
											<video controls className="w-full">
												<source src={file.fileUrl} type={file.mimeType} />
												Your browser does not support the video element.
											</video>
										</div>
									</div>
								) : (
									<div className="text-center p-6">
										<div className="flex flex-col items-center justify-center">
											{getFileIcon(file.mimeType)}
											<h3 className="text-lg font-medium mt-4">Preview not available</h3>
											<p className="text-muted-foreground text-sm mt-2">
												This file type ({file.mimeType}) cannot be previewed directly.
											</p>
											<Button
												variant="default"
												size="sm"
												className="mt-4"
												onClick={() => window.open(file.fileUrl, '_blank')}
											>
												<ExternalLink className="h-4 w-4 mr-2" />
												Open File
											</Button>
										</div>
									</div>
								)}
							</div>
						</TabsContent>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
