def load_litter_points(file_path):
    litter_points = {}
    with open(file_path, 'r') as file:
        for line in file:
            # Strip any leading/trailing whitespace and split by space
            parts = line.strip().split(' ')
            if len(parts) == 2:
                litter_name = parts[0]
                points = int(parts[1])
                litter_points[litter_name] = points
    return litter_points