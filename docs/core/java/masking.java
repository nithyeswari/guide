public class MaskingRewritePolicy implements RewritePolicy {
    private static final Pattern PATTERN = Pattern.compile("(password|ssn|credit|card)=([^,}\\s]+)");
    
    @Override
    public LogEvent rewrite(LogEvent event) {
        Message msg = event.getMessage();
        if (msg != null) {
            String formattedMsg = msg.getFormattedMessage();
            if (formattedMsg != null) {
                Matcher matcher = PATTERN.matcher(formattedMsg);
                if (matcher.find()) {
                    String maskedMsg = matcher.replaceAll("$1=****");
                    return new Log4jLogEvent.Builder(event)
                            .setMessage(new SimpleMessage(maskedMsg))
                            .build();
                }
            }
        }
        return event;
    }
}
