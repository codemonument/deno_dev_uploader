export type UploadPair = {
    /**
     * The source folder path to upload
     */
    source: string;

    /**
     * The remote folder path to upload to.
     */
    destination: string;
};

export type IgnorePatterns = {
    pathEndsWith: string[];
    pathIncludes: string[];
};
