// pom.xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.techblog</groupId>
    <artifactId>blog-searcher</artifactId>
    <version>1.0-SNAPSHOT</version>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.0</version>
    </parent>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.jsoup</groupId>
            <artifactId>jsoup</artifactId>
            <version>1.15.3</version>
        </dependency>
        <dependency>
            <groupId>com.rometools</groupId>
            <artifactId>rome</artifactId>
            <version>1.18.0</version>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>1.18.22</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.13.3</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>

// src/main/java/com/techblog/BlogSearcherApplication.java
package com.techblog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class BlogSearcherApplication {
    public static void main(String[] args) {
        SpringApplication.run(BlogSearcherApplication.class, args);
    }
}

// src/main/java/com/techblog/model/BlogPost.java
package com.techblog.model;

import lombok.Data;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@Builder
public class BlogPost {
    private String title;
    private String link;
    private String content;
    private String blogName;
    private LocalDateTime publishDate;
    private String excerpt;
}

// src/main/java/com/techblog/model/SearchResult.java
package com.techblog.model;

import lombok.Data;
import java.util.List;

@Data
public class SearchResult {
    private String query;
    private int totalResults;
    private List<BlogPost> posts;
    private long searchTimeMs;
}

// src/main/java/com/techblog/config/BlogConfig.java
package com.techblog.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import java.util.Map;

@Data
@Configuration
@ConfigurationProperties(prefix = "blog")
public class BlogConfig {
    private Map<String, BlogDetails> sources;

    @Data
    public static class BlogDetails {
        private String url;
        private String rssUrl;
        private String articleSelector;
        private String titleSelector;
        private String contentSelector;
        private String dateSelector;
        private String dateFormat;
    }
}

// src/main/java/com/techblog/service/BlogSearchService.java
package com.techblog.service;

import com.techblog.config.BlogConfig;
import com.techblog.model.BlogPost;
import com.techblog.model.SearchResult;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BlogSearchService {
    private final BlogConfig blogConfig;
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);

    public SearchResult search(String query, int maxBlogs) {
        long startTime = System.currentTimeMillis();
        List<CompletableFuture<List<BlogPost>>> futures = new ArrayList<>();

        // Process each blog concurrently
        blogConfig.getSources().entrySet().stream()
                .limit(maxBlogs)
                .forEach(entry -> {
                    CompletableFuture<List<BlogPost>> future = CompletableFuture
                            .supplyAsync(() -> searchBlog(entry.getKey(), entry.getValue(), query), executorService);
                    futures.add(future);
                });

        // Collect all results
        List<BlogPost> allPosts = futures.stream()
                .map(CompletableFuture::join)
                .flatMap(List::stream)
                .filter(post -> matches(post, query))
                .sorted((p1, p2) -> p2.getPublishDate().compareTo(p1.getPublishDate()))
                .collect(Collectors.toList());

        SearchResult result = new SearchResult();
        result.setQuery(query);
        result.setTotalResults(allPosts.size());
        result.setPosts(allPosts);
        result.setSearchTimeMs(System.currentTimeMillis() - startTime);

        return result;
    }

    private List<BlogPost> searchBlog(String blogName, BlogConfig.BlogDetails details, String query) {
        try {
            if (details.getRssUrl() != null) {
                return searchRssFeed(blogName, details);
            } else {
                return scrapeWebsite(blogName, details);
            }
        } catch (Exception e) {
            log.error("Error searching blog {}: {}", blogName, e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<BlogPost> searchRssFeed(String blogName, BlogConfig.BlogDetails details) {
        try {
            URL feedUrl = new URL(details.getRssUrl());
            SyndFeedInput input = new SyndFeedInput();
            SyndFeed feed = input.build(new XmlReader(feedUrl));

            return feed.getEntries().stream()
                    .map(entry -> convertToPost(entry, blogName))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error reading RSS feed for {}: {}", blogName, e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<BlogPost> scrapeWebsite(String blogName, BlogConfig.BlogDetails details) {
        try {
            Document doc = Jsoup.connect(details.getUrl())
                    .userAgent("Mozilla/5.0")
                    .timeout(10000)
                    .get();

            return doc.select(details.getArticleSelector()).stream()
                    .map(article -> convertToPost(article, blogName, details))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error scraping website for {}: {}", blogName, e.getMessage());
            return new ArrayList<>();
        }
    }

    private BlogPost convertToPost(SyndEntry entry, String blogName) {
        return BlogPost.builder()
                .title(entry.getTitle())
                .link(entry.getLink())
                .content(entry.getDescription() != null ? entry.getDescription().getValue() : "")
                .blogName(blogName)
                .publishDate(LocalDateTime.now()) // Convert actual date if available
                .excerpt(extractExcerpt(entry.getDescription() != null ? entry.getDescription().getValue() : ""))
                .build();
    }

    private BlogPost convertToPost(Element article, String blogName, BlogConfig.BlogDetails details) {
        String title = article.select(details.getTitleSelector()).text();
        String content = article.select(details.getContentSelector()).text();
        String dateStr = article.select(details.getDateSelector()).text();
        LocalDateTime publishDate = parseDate(dateStr, details.getDateFormat());

        return BlogPost.builder()
                .title(title)
                .link(article.select("a").attr("abs:href"))
                .content(content)
                .blogName(blogName)
                .publishDate(publishDate)
                .excerpt(extractExcerpt(content))
                .build();
    }

    private String extractExcerpt(String content) {
        if (content == null || content.isEmpty()) {
            return "";
        }
        int length = Math.min(content.length(), 200);
        return content.substring(0, length) + "...";
    }

    private LocalDateTime parseDate(String dateStr, String format) {
        try {
            return LocalDateTime.parse(dateStr, DateTimeFormatter.ofPattern(format));
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }

    private boolean matches(BlogPost post, String query) {
        String lowercaseQuery = query.toLowerCase();
        return post.getTitle().toLowerCase().contains(lowercaseQuery) ||
                post.getContent().toLowerCase().contains(lowercaseQuery);
    }
}

// src/main/java/com/techblog/controller/SearchController.java
package com.techblog.controller;

import com.techblog.model.SearchResult;
import com.techblog.service.BlogSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class SearchController {
    private final BlogSearchService blogSearchService;

    @GetMapping("/search")
    public SearchResult search(
            @RequestParam String query,
            @RequestParam(defaultValue = "5") int maxBlogs) {
        return blogSearchService.search(query, maxBlogs);
    }
}

// src/main/resources/application.yml
blog:
  sources:
    meta:
      url: https://engineering.fb.com/
      rssUrl: https://engineering.fb.com/feed/
      articleSelector: article
      titleSelector: h1
      contentSelector: .content
      dateSelector: .date
      dateFormat: yyyy-MM-dd HH:mm:ss
    netflix:
      url: https://netflixtechblog.com/
      rssUrl: https://netflixtechblog.com/feed
      articleSelector: article
      titleSelector: h1
      contentSelector: .content
      dateSelector: .date
      dateFormat: yyyy-MM-dd HH:mm:ss
    # Add more blog configurations here