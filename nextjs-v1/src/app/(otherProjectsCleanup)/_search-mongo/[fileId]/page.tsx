import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { mongoSearchApi } from "../utils/api";
import { FileUploadedData } from "@sraz-sw/carwise-shared";

interface FilePageProps {
  params: {
    fileId: string;
  };
}

export default async function FilePage({ params }: FilePageProps) {
  let file: FileUploadedData | null = null;

  try {
    file = await mongoSearchApi.getFileById(params.fileId);
  } catch (error) {
    console.error("Error fetching file:", error);
    notFound();
  }

  if (!file) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/search-mongo"
          className="text-primary flex items-center gap-1 text-sm hover:underline"
        >
          <span>←</span> Back to files
        </Link>
      </div>

      {/* File Header */}
      <div className="bg-card mb-8 rounded-lg p-6 shadow-sm">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <FileIcon type={file.fileType} />
            <h1 className="text-2xl font-bold">{file.fileName}</h1>
          </div>

          {file.fileUrl && (
            <a
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2 text-sm"
            >
              View Original File
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="File Type" value={file.fileType} />
          <InfoCard label="MIME Type" value={file.mimeType} />
          <InfoCard label="Size" value={formatFileSize(file.size)} />
          <InfoCard
            label="Upload Date"
            value={format(new Date(file.uploadAt), "PPP")}
          />
          <InfoCard label="Status" value={file.status} />
          <InfoCard
            label="Content Type"
            value={file.contentTypeHighLevel.join(", ")}
          />
          <InfoCard
            label="Modified Date"
            value={format(new Date(file.modifiedAt), "PPP")}
          />
          <InfoCard
            label="Embedding Size"
            value={
              file.embeddings
                ? `${file.embeddings.length} dimensions`
                : "None"
            }
          />
        </div>
      </div>

      {/* Tabs for Entities and Snippets */}
      <div className="mb-8">
        <div className="mb-6 flex border-b">
          <h2 className="border-primary border-b-2 px-4 py-2 text-xl font-semibold">
            All Data
          </h2>
        </div>

        {/* Entities Section */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-medium">
            Entities ({file.entities?.length || 0})
          </h3>

          {!file.entities || file.entities.length === 0 ? (
            <p className="text-muted-foreground">
              No entities found in this file.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {file.entities.map((entity) => (
                <div
                  key={entity.id}
                  className="bg-card rounded-lg border p-4 transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold">
                      {entity.name}
                      {entity.confidence && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          (Confidence:{" "}
                          {Math.round(entity.confidence * 100)}%)
                        </span>
                      )}
                    </h4>
                    <EntityBadge category={entity.category} />
                  </div>

                  {entity.description && (
                    <p className="text-muted-foreground mb-3 text-sm">
                      {entity.description}
                    </p>
                  )}

                  <div className="mb-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    {entity.address && (
                      <EntityDetail
                        label="Address"
                        value={entity.address}
                      />
                    )}
                    {entity.phoneNumber && (
                      <EntityDetail
                        label="Phone"
                        value={entity.phoneNumber}
                      />
                    )}
                    {entity.email && (
                      <EntityDetail label="Email" value={entity.email} />
                    )}
                    {entity.website && (
                      <EntityDetail
                        label="Website"
                        value={entity.website}
                      />
                    )}
                    {entity.id_official && (
                      <EntityDetail
                        label="ID"
                        value={entity.id_official}
                      />
                    )}
                  </div>

                  {entity.keywords && entity.keywords.length > 0 && (
                    <div className="mt-2">
                      <h5 className="text-muted-foreground mb-1 text-xs font-medium">
                        Keywords
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {entity.keywords.map((keyword: string) => (
                          <span
                            key={keyword}
                            className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {entity.contextWithinTheMainCase && (
                    <div className="mt-3 border-t pt-2">
                      <h5 className="text-muted-foreground mb-1 text-xs font-medium">
                        Context
                      </h5>
                      <p className="text-sm italic">
                        {entity.contextWithinTheMainCase}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Snippets Section */}
        <div>
          <h3 className="mb-4 text-lg font-medium">
            Snippets ({file.snippets?.length || 0})
          </h3>

          {!file.snippets || file.snippets.length === 0 ? (
            <p className="text-muted-foreground">
              No snippets found in this file.
            </p>
          ) : (
            <div className="space-y-4">
              {file.snippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className="bg-card rounded-lg border p-4 transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <h4 className="font-semibold">
                      Snippet Type:{" "}
                      <span className="font-normal">{snippet.type}</span>
                    </h4>
                    <div className="text-muted-foreground text-xs">
                      Created: {format(new Date(snippet.createdAt), "PPP")}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h5 className="mb-1 text-sm font-medium">Content</h5>
                    <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">
                      {snippet.content || "No content available"}
                    </div>
                  </div>

                  {snippet.summary && (
                    <div className="mb-4">
                      <h5 className="mb-1 text-sm font-medium">Summary</h5>
                      <p className="text-sm">{snippet.summary}</p>
                    </div>
                  )}

                  <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <h5 className="text-muted-foreground mb-1 text-xs font-medium">
                        Location
                      </h5>
                      <p className="text-sm">
                        Start: {snippet.start.join(", ")}
                        <br />
                        End: {snippet.end.join(", ")}
                      </p>
                    </div>

                    {snippet.timeOfTheContentOfTheSnippet && (
                      <div>
                        <h5 className="text-muted-foreground mb-1 text-xs font-medium">
                          Time Reference
                        </h5>
                        <p className="text-sm">
                          {snippet.timeOfTheContentOfTheSnippet}
                        </p>
                      </div>
                    )}
                  </div>

                  {snippet.keywords && snippet.keywords.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-muted-foreground mb-1 text-xs font-medium">
                        Keywords
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {snippet.keywords.map((keyword: string) => (
                          <span
                            key={keyword}
                            className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {snippet.contextWithinTheMainCase && (
                    <div className="border-t pt-2">
                      <h5 className="text-muted-foreground mb-1 text-xs font-medium">
                        Context
                      </h5>
                      <p className="text-sm italic">
                        {snippet.contextWithinTheMainCase}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-muted/50 rounded p-3">
    <p className="text-muted-foreground mb-1 text-xs font-medium">
      {label}
    </p>
    <p className="truncate font-medium">{value || "N/A"}</p>
  </div>
);

const EntityBadge = ({ category }: { category: string }) => {
  const colorMap: Record<string, string> = {
    person: "bg-blue-100 text-blue-800",
    organization: "bg-purple-100 text-purple-800",
    location: "bg-green-100 text-green-800",
    product: "bg-yellow-100 text-yellow-800",
    event: "bg-red-100 text-red-800",
    vehicle: "bg-cyan-100 text-cyan-800",
    property: "bg-pink-100 text-pink-800",
    other: "bg-gray-100 text-gray-800",
  };

  const color = colorMap[category.toLowerCase()] || colorMap.other;

  return (
    <span className={`rounded-full px-2 py-1 text-xs ${color}`}>
      {category}
    </span>
  );
};

const EntityDetail = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div>
    <span className="text-muted-foreground mr-1 text-xs">{label}:</span>
    <span className="text-sm">{value}</span>
  </div>
);

// Helper component for file type icon
const FileIcon = ({ type }: { type: string }) => {
  const iconClass =
    type === "image"
      ? "📷"
      : type === "video"
        ? "🎬"
        : type === "audio"
          ? "🎵"
          : type === "document"
            ? "📄"
            : "📁";

  return <span className="text-3xl">{iconClass}</span>;
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
