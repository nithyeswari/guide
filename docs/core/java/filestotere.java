// File Storage Strategy Interface
public interface FileStorageStrategy {
    byte[] readFile(String path) throws Exception;
    void writeFile(String path, byte[] content) throws Exception;
    void deleteFile(String path) throws Exception;
    boolean fileExists(String path) throws Exception;
    List<String> listFiles(String directory) throws Exception;
    String getFileUrl(String path) throws Exception;
}

// Local File System Implementation
@Component
@ConditionalOnProperty(name = "file.storage.type", havingValue = "local")
public class LocalFileStorageStrategy implements FileStorageStrategy {
    
    @Value("${file.storage.local.base-path:./files}")
    private String basePath;
    
    @Override
    public byte[] readFile(String path) throws Exception {
        Path filePath = Paths.get(basePath, path);
        if (!Files.exists(filePath)) {
            throw new FileNotFoundException("File not found: " + path);
        }
        return Files.readAllBytes(filePath);
    }
    
    @Override
    public void writeFile(String path, byte[] content) throws Exception {
        Path filePath = Paths.get(basePath, path);
        Files.createDirectories(filePath.getParent());
        Files.write(filePath, content, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
    }
    
    @Override
    public void deleteFile(String path) throws Exception {
        Path filePath = Paths.get(basePath, path);
        Files.deleteIfExists(filePath);
    }
    
    @Override
    public boolean fileExists(String path) throws Exception {
        Path filePath = Paths.get(basePath, path);
        return Files.exists(filePath);
    }
    
    @Override
    public List<String> listFiles(String directory) throws Exception {
        Path dirPath = Paths.get(basePath, directory);
        if (!Files.exists(dirPath)) {
            return Collections.emptyList();
        }
        
        return Files.walk(dirPath)
                .filter(Files::isRegularFile)
                .map(path -> Paths.get(basePath).relativize(path).toString())
                .collect(Collectors.toList());
    }
    
    @Override
    public String getFileUrl(String path) throws Exception {
        return "file://" + Paths.get(basePath, path).toAbsolutePath().toString();
    }
}

// Google Cloud Storage Implementation
@Component
@ConditionalOnProperty(name = "file.storage.type", havingValue = "gcp")
public class GcpStorageStrategy implements FileStorageStrategy {
    
    private final Storage storage;
    
    @Value("${file.storage.gcp.bucket-name}")
    private String bucketName;
    
    @Value("${file.storage.gcp.project-id}")
    private String projectId;
    
    public GcpStorageStrategy(@Value("${file.storage.gcp.credentials-path:}") String credentialsPath) {
        try {
            StorageOptions.Builder builder = StorageOptions.newBuilder().setProjectId(projectId);
            
            if (!credentialsPath.isEmpty()) {
                builder.setCredentials(ServiceAccountCredentials.fromStream(
                    new FileInputStream(credentialsPath)));
            }
            
            this.storage = builder.build().getService();
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize GCP Storage", e);
        }
    }
    
    @Override
    public byte[] readFile(String path) throws Exception {
        Blob blob = storage.get(bucketName, path);
        if (blob == null) {
            throw new FileNotFoundException("File not found: " + path);
        }
        return blob.getContent();
    }
    
    @Override
    public void writeFile(String path, byte[] content) throws Exception {
        BlobId blobId = BlobId.of(bucketName, path);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId).build();
        storage.create(blobInfo, content);
    }
    
    @Override
    public void deleteFile(String path) throws Exception {
        BlobId blobId = BlobId.of(bucketName, path);
        storage.delete(blobId);
    }
    
    @Override
    public boolean fileExists(String path) throws Exception {
        Blob blob = storage.get(bucketName, path);
        return blob != null && blob.exists();
    }
    
    @Override
    public List<String> listFiles(String directory) throws Exception {
        String prefix = directory.endsWith("/") ? directory : directory + "/";
        
        return StreamSupport.stream(
                storage.list(bucketName, Storage.BlobListOption.prefix(prefix)).iterateAll().spliterator(),
                false)
                .map(BlobInfo::getName)
                .collect(Collectors.toList());
    }
    
    @Override
    public String getFileUrl(String path) throws Exception {
        return String.format("gs://%s/%s", bucketName, path);
    }
}

// AWS S3 Implementation
@Component
@ConditionalOnProperty(name = "file.storage.type", havingValue = "aws")
public class AwsS3StorageStrategy implements FileStorageStrategy {
    
    private final AmazonS3 s3Client;
    
    @Value("${file.storage.aws.bucket-name}")
    private String bucketName;
    
    @Value("${file.storage.aws.region}")
    private String region;
    
    public AwsS3StorageStrategy() {
        this.s3Client = AmazonS3ClientBuilder.standard()
                .withRegion(region)
                .build();
    }
    
    @Override
    public byte[] readFile(String path) throws Exception {
        try {
            S3Object object = s3Client.getObject(bucketName, path);
            return IOUtils.toByteArray(object.getObjectContent());
        } catch (AmazonS3Exception e) {
            if (e.getStatusCode() == 404) {
                throw new FileNotFoundException("File not found: " + path);
            }
            throw e;
        }
    }
    
    @Override
    public void writeFile(String path, byte[] content) throws Exception {
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(content.length);
        
        s3Client.putObject(bucketName, path, new ByteArrayInputStream(content), metadata);
    }
    
    @Override
    public void deleteFile(String path) throws Exception {
        s3Client.deleteObject(bucketName, path);
    }
    
    @Override
    public boolean fileExists(String path) throws Exception {
        return s3Client.doesObjectExist(bucketName, path);
    }
    
    @Override
    public List<String> listFiles(String directory) throws Exception {
        String prefix = directory.endsWith("/") ? directory : directory + "/";
        
        ObjectListing listing = s3Client.listObjects(bucketName, prefix);
        return listing.getObjectSummaries().stream()
                .map(S3ObjectSummary::getKey)
                .collect(Collectors.toList());
    }
    
    @Override
    public String getFileUrl(String path) throws Exception {
        return s3Client.getUrl(bucketName, path).toString();
    }
}

// Azure Blob Storage Implementation
@Component
@ConditionalOnProperty(name = "file.storage.type", havingValue = "azure")
public class AzureBlobStorageStrategy implements FileStorageStrategy {
    
    private final BlobServiceClient blobServiceClient;
    private final BlobContainerClient containerClient;
    
    @Value("${file.storage.azure.container-name}")
    private String containerName;
    
    public AzureBlobStorageStrategy(@Value("${file.storage.azure.connection-string}") String connectionString) {
        this.blobServiceClient = new BlobServiceClientBuilder()
                .connectionString(connectionString)
                .buildClient();
        this.containerClient = blobServiceClient.getBlobContainerClient(containerName);
    }
    
    @Override
    public byte[] readFile(String path) throws Exception {
        BlobClient blobClient = containerClient.getBlobClient(path);
        if (!blobClient.exists()) {
            throw new FileNotFoundException("File not found: " + path);
        }
        
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        blobClient.download(outputStream);
        return outputStream.toByteArray();
    }
    
    @Override
    public void writeFile(String path, byte[] content) throws Exception {
        BlobClient blobClient = containerClient.getBlobClient(path);
        blobClient.upload(new ByteArrayInputStream(content), content.length, true);
    }
    
    @Override
    public void deleteFile(String path) throws Exception {
        BlobClient blobClient = containerClient.getBlobClient(path);
        blobClient.delete();
    }
    
    @Override
    public boolean fileExists(String path) throws Exception {
        BlobClient blobClient = containerClient.getBlobClient(path);
        return blobClient.exists();
    }
    
    @Override
    public List<String> listFiles(String directory) throws Exception {
        String prefix = directory.endsWith("/") ? directory : directory + "/";
        
        return containerClient.listBlobsByHierarchy(prefix)
                .stream()
                .filter(item -> !item.isPrefix())
                .map(BlobItem::getName)
                .collect(Collectors.toList());
    }
    
    @Override
    public String getFileUrl(String path) throws Exception {
        BlobClient blobClient = containerClient.getBlobClient(path);
        return blobClient.getBlobUrl();
    }
}

// Main Generic File Service
@Service
public class GenericFileService {
    
    private final FileStorageStrategy storageStrategy;
    private static final Logger logger = LoggerFactory.getLogger(GenericFileService.class);
    
    public GenericFileService(FileStorageStrategy storageStrategy) {
        this.storageStrategy = storageStrategy;
    }
    
    public byte[] readFile(String path) {
        try {
            logger.info("Reading file: {}", path);
            return storageStrategy.readFile(path);
        } catch (Exception e) {
            logger.error("Error reading file: {}", path, e);
            throw new RuntimeException("Failed to read file: " + path, e);
        }
    }
    
    public void writeFile(String path, byte[] content) {
        try {
            logger.info("Writing file: {}", path);
            storageStrategy.writeFile(path, content);
        } catch (Exception e) {
            logger.error("Error writing file: {}", path, e);
            throw new RuntimeException("Failed to write file: " + path, e);
        }
    }
    
    public void writeFile(String path, String content) {
        writeFile(path, content.getBytes(StandardCharsets.UTF_8));
    }
    
    public void writeFile(String path, InputStream inputStream) {
        try {
            byte[] content = IOUtils.toByteArray(inputStream);
            writeFile(path, content);
        } catch (Exception e) {
            logger.error("Error writing file from InputStream: {}", path, e);
            throw new RuntimeException("Failed to write file from InputStream: " + path, e);
        }
    }
    
    public void deleteFile(String path) {
        try {
            logger.info("Deleting file: {}", path);
            storageStrategy.deleteFile(path);
        } catch (Exception e) {
            logger.error("Error deleting file: {}", path, e);
            throw new RuntimeException("Failed to delete file: " + path, e);
        }
    }
    
    public boolean fileExists(String path) {
        try {
            return storageStrategy.fileExists(path);
        } catch (Exception e) {
            logger.error("Error checking file existence: {}", path, e);
            return false;
        }
    }
    
    public List<String> listFiles(String directory) {
        try {
            logger.info("Listing files in directory: {}", directory);
            return storageStrategy.listFiles(directory);
        } catch (Exception e) {
            logger.error("Error listing files in directory: {}", directory, e);
            throw new RuntimeException("Failed to list files in directory: " + directory, e);
        }
    }
    
    public String getFileUrl(String path) {
        try {
            return storageStrategy.getFileUrl(path);
        } catch (Exception e) {
            logger.error("Error getting file URL: {}", path, e);
            throw new RuntimeException("Failed to get file URL: " + path, e);
        }
    }
    
    public String readFileAsString(String path) {
        byte[] content = readFile(path);
        return new String(content, StandardCharsets.UTF_8);
    }
    
    public void copyFile(String sourcePath, String destinationPath) {
        try {
            byte[] content = readFile(sourcePath);
            writeFile(destinationPath, content);
            logger.info("Copied file from {} to {}", sourcePath, destinationPath);
        } catch (Exception e) {
            logger.error("Error copying file from {} to {}", sourcePath, destinationPath, e);
            throw new RuntimeException("Failed to copy file", e);
        }
    }
    
    public void moveFile(String sourcePath, String destinationPath) {
        try {
            copyFile(sourcePath, destinationPath);
            deleteFile(sourcePath);
            logger.info("Moved file from {} to {}", sourcePath, destinationPath);
        } catch (Exception e) {
            logger.error("Error moving file from {} to {}", sourcePath, destinationPath, e);
            throw new RuntimeException("Failed to move file", e);
        }
    }
}

// REST Controller Example
@RestController
@RequestMapping("/api/files")
public class FileController {
    
    private final GenericFileService fileService;
    
    public FileController(GenericFileService fileService) {
        this.fileService = fileService;
    }
    
    @GetMapping("/{path:.+}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String path) {
        try {
            byte[] content = fileService.readFile(path);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + Paths.get(path).getFileName() + "\"")
                    .body(content);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping("/{path:.+}")
    public ResponseEntity<String> uploadFile(@PathVariable String path, @RequestParam("file") MultipartFile file) {
        try {
            fileService.writeFile(path, file.getInputStream());
            return ResponseEntity.ok("File uploaded successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to upload file: " + e.getMessage());
        }
    }
    
    @DeleteMapping("/{path:.+}")
    public ResponseEntity<String> deleteFile(@PathVariable String path) {
        try {
            fileService.deleteFile(path);
            return ResponseEntity.ok("File deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to delete file: " + e.getMessage());
        }
    }
    
    @GetMapping("/list/{directory:.+}")
    public ResponseEntity<List<String>> listFiles(@PathVariable String directory) {
        try {
            List<String> files = fileService.listFiles(directory);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.emptyList());
        }
    }
    
    @GetMapping("/exists/{path:.+}")
    public ResponseEntity<Boolean> fileExists(@PathVariable String path) {
        boolean exists = fileService.fileExists(path);
        return ResponseEntity.ok(exists);
    }
}

// Configuration Properties
@ConfigurationProperties(prefix = "file.storage")
@Data
public class FileStorageProperties {
    private String type; // local, gcp, aws, azure
    
    private Local local = new Local();
    private Gcp gcp = new Gcp();
    private Aws aws = new Aws();
    private Azure azure = new Azure();
    
    @Data
    public static class Local {
        private String basePath = "./files";
    }
    
    @Data
    public static class Gcp {
        private String bucketName;
        private String projectId;
        private String credentialsPath;
    }
    
    @Data
    public static class Aws {
        private String bucketName;
        private String region;
        private String accessKey;
        private String secretKey;
    }
    
    @Data
    public static class Azure {
        private String containerName;
        private String connectionString;
    }
}

// Exception Handler
@ControllerAdvice
public class FileServiceExceptionHandler {
    
    @ExceptionHandler(FileNotFoundException.class)
    public ResponseEntity<String> handleFileNotFound(FileNotFoundException e) {
        return ResponseEntity.notFound().build();
    }
    
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntimeException(RuntimeException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}